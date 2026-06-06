# Zenly — dokumentacja techniczna

Aplikacja webowa do interwencji psychologicznych przeciw stresowi w pracy. Architektura
trójwarstwowa, uruchamiana lokalnie jedną komendą (`docker compose up --build`):
Next.js + PostgreSQL + Docker Compose.

> Ten dokument jest deliverable'em (materiał do oddawanego PDF). Zawiera: architekturę
> warstw, model danych (ERD), schemat bazy, tabelę realizacji wymagań bezpieczeństwa,
> decyzje i ograniczenia zakresu, kopię zapasową/odtwarzanie oraz realizację praw RODO.

## 1. Architektura trójwarstwowa

| Warstwa | Katalog | Odpowiedzialność | Zasada |
|---|---|---|---|
| Prezentacja | `src/app/**`, komponenty | Strony/komponenty Next wg makiet | nigdy nie importuje `@prisma/client` |
| Transport | `src/server/actions/**` | Server Actions (`'use server'`) — adapter do logiki | wywołuje serwisy, nie bazę |
| Logika biznesowa | `src/server/domain/**` (czyste funkcje), `src/server/services/**` (orkiestracja + RBAC) | cała logika, kontrola dostępu, auth | jedyna sięgająca do warstwy danych |
| Dane | `src/server/data/**` | `db.ts` (PrismaClient) + `*.repository.ts` | jedyna importująca `@prisma/client` |

Granica „dostęp do bazy wyłącznie przez logikę" jest wymuszana regułą ESLint
(`no-restricted-imports`): `@prisma/client` wolno importować tylko w `src/server/data/**`,
a warstwę danych — tylko z `src/server/services/**`. Reguła stanowi formalny dowód
architektoniczny (`npm run lint`).

## 2. Model danych — ERD

Diagram ERD jest **generowany automatycznie** z `prisma/schema.prisma` przez generator
`prisma-erd-generator` do pliku [`ERD.md`](ERD.md) (Mermaid) — nie jest pisany ręcznie i
zawsze odzwierciedla aktualny schemat. Regeneracja: `npm run db:erd`. Generator jest
pomijany w buildzie Dockera (`DISABLE_ERD=true`) i — przy wyjściu `.md` — nie wymaga
Chromium, więc nie wpływa na `docker compose up --build`. Plik [`ERD.md`](ERD.md) wchodzi
do oddawanego PDF.

### Typy wyliczeniowe (enum)

| Enum | Wartości |
|---|---|
| `Rola` | EMPLOYEE, PSYCHOLOGIST, ADMIN, HR |
| `PoziomStresu` | LOW, MEDIUM, HIGH |
| `TypModulu` | ODDECH, MEDYTACJA, MUZYKA, CWICZENIA, KONSULTACJA |
| `PasmoCzasu` | SHORT_5_10, LONG_15_30 |
| `StatusWizyty` | ZAREZERWOWANA, ODBYTA, ANULOWANA |
| `TypPowiadomienia` | ANKIETA_PRZYPOMNIENIE, KONSULTACJA_POTWIERDZENIE, PRZERWA, SYSTEM |
| `TypZdarzenia` | LOGOWANIE_OK, LOGOWANIE_BLAD, KONTO_ZABLOKOWANE, REJESTRACJA, RODO_EKSPORT, RODO_USUNIECIE, DOSTEP_ODMOWA |

## 3. Schemat bazy danych

Klucze główne to `id` (cuid). Poniżej kluczowe pola, ograniczenia i relacje każdej encji.

### User
| Pole | Typ | Ograniczenia |
|---|---|---|
| id | String | PK (cuid) |
| imie, nazwisko | String | — |
| login | String | UNIQUE — logowanie (RB-01/03) |
| email | String | UNIQUE — kontakt / RODO (RB-02) |
| hasloHash | String | hasło wyłącznie zahashowane (bcryptjs) |
| rola | Rola | default EMPLOYEE |
| failedLoginCount | Int | default 0 — blokada konta |
| lockedUntil | DateTime? | termin odblokowania |
| createdAt, updatedAt | DateTime | — |

Relacje: 1–0..1 `Psycholog`; 1–N `WynikAnkiety`, `Wizyta`, `Powiadomienie`, `SesjaUzytkownika`, `SecurityEvent`.

### Psycholog
`imie`, `nazwisko`, `telefon`, `linkDoSpotkania`, `specjalizacja`; `userId` UNIQUE? (`onDelete: SetNull`).
Relacje: 0..1 `Kalendarz`, 1–N `Wizyta`.

### Kalendarz
`psychologId` UNIQUE (`onDelete: Cascade`). Relacja: 1–N `Termin`.

### Termin
`kalendarzId` (`onDelete: Cascade`), `poczatek`, `koniec` (DateTime), `zajety` (Boolean, default false).
Index `(kalendarzId, poczatek)`. Relacja: 0..1 `Wizyta`.

### Wizyta
`userId` (Cascade), `psychologId`, `terminId` UNIQUE, `status` (StatusWizyty, default ZAREZERWOWANA),
`linkDoSpotkania`, `createdAt`.

### Ankieta / Pytanie / WynikAnkiety / Odpowiedz
- `Ankieta`: `tytul`, `wersja` (default 1), `aktywna` (default true).
- `Pytanie`: `tresc`, `kolejnosc`; UNIQUE `(ankietaId, kolejnosc)`.
- `WynikAnkiety`: `userId` (Cascade), `ankietaId`, `sumaPunktow` (Int), `poziomStresu` (PoziomStresu), `dataWypelnienia`; index `(userId, dataWypelnienia)`.
- `Odpowiedz`: `wynikAnkietyId` (Cascade), `pytanieId`, `wartosc` (Int 1..5, walidacja w domenie); UNIQUE `(wynikAnkietyId, pytanieId)`.

### Modul / ModulZasob
- `Modul`: `typ` (TypModulu, UNIQUE), `tytul`, `opis`.
- `ModulZasob`: `modulId` (Cascade), `etykieta`, `url`, `pasmo` (PasmoCzasu).

### Powiadomienie
`userId` (`onDelete: Cascade`), `typ` (TypPowiadomienia), `tresc`, `przeczytane` (Boolean, default false),
`createdAt`. Index `(userId, przeczytane)`.

### SesjaUzytkownika (encja sesji uwierzytelnienia, RB-05)
| Pole | Typ | Uwagi |
|---|---|---|
| userId | String | FK (Cascade) |
| token | String | UNIQUE — przechowywany ZAHASHOWANY (SHA-256); cookie nosi wartość surową |
| poczatek | DateTime | = dataRozpoczecia |
| koniec | DateTime? | = dataZakonczenia; ustawiany przy wylogowaniu |
| wygasa | DateTime | expiresAt |
| ostatniaAktywnosc | DateTime | — |
| ostatniaPrzerwa | DateTime? | RB-22 — timer przerwy korzysta z tej samej encji |
| ip | String? | — |

Index `(userId)`.

### SecurityEvent
`userId?` (`onDelete: SetNull`), `typ` (TypZdarzenia), `opis` (nigdy hasło ani pełne odpowiedzi),
`login?` (próbowany login), `ip?`, `createdAt`. Index `(typ, createdAt)`.

### Odstępstwa od diagramu klas (uzasadnione)
- `haslo` → `hasloHash`: hasło wyłącznie zahashowane (bcryptjs) — RB-04 i wymóg „hasła tylko w postaci zahashowanej".
- token sesji w bazie jako hash SHA-256 (cookie nosi wartość surową) — wyciek bazy nie ujawnia użytecznych tokenów.
- metody OO `zaloguj()`/`wyloguj()`/`zakonczSesje()` → funkcje warstwy logiki (`authService`).
- Administrator = rola `ADMIN` na `User` (nie osobna tabela).
- Moduły (dziedziczenie) spłaszczone do `Modul` + `typ` (+ `ModulZasob`); `KONSULTACJA` = cel rekomendacji (trasa `/konsultacja`), nie seedowany moduł treściowy.

## 4. Tabela zakresu realizacji wymagań bezpieczeństwa

Status każdej pozycji: **zrealizowane** (wdrożone w kodzie), **częściowo** (wdrożone w zakresie
demo, z opisanym ograniczeniem) lub **poza zakresem** (świadoma decyzja zakresu pracy — patrz
sekcja „Decyzje i ograniczenia zakresu"). Tabela jest kompletna: ujmuje także pozycje świadomie
niezrealizowane, wraz z uzasadnieniem.

| Wymaganie | Realizacja | Warstwa / miejsce | Status |
|---|---|---|---|
| Hasła wyłącznie zahashowane (RB-04) | bcryptjs (hash/compare) | `authService` | zrealizowane (krok 4) |
| Silna polityka hasła | `validatePasswordStrength` (≥12 zn., mała/wielka/cyfra/specjalny) | `domain/password.ts` | zrealizowane (krok 2) |
| Blokada konta po 5 nieudanych próbach | `shouldLockAccount` → `failedLoginCount`/`lockedUntil` + log | `domain/account-lock.ts`, `authService` | zrealizowane (krok 2/4) |
| Bezpieczna sesja | własna sesja: surowy token w cookie, SHA-256 w DB; `koniec` zamyka sesję | `SesjaUzytkownika`, `authService`, `lib/session-cookie.ts` | zrealizowane (krok 4) |
| Atrybuty cookie | httpOnly + sameSite=lax + secure (prod) + maxAge | `lib/session-cookie.ts` | zrealizowane (krok 4) |
| Ochrona CSRF | sameSite=lax + sprawdzenie Origin/Host w Server Actions | `lib/csrf.ts` | zrealizowane (krok 3/4) |
| Kontrola dostępu (RBAC) | `requireUser(roles)` + `middleware.ts` (presence cookie, edge-safe) | `authService`, `middleware.ts` | zrealizowane (krok 4/6) |
| Kontrola dostępu paneli (RBAC) | `requirePanelRole` — panele Admin/HR/psycholog + log `DOSTEP_ODMOWA` na odmowie | `authService`, `security.service` | zrealizowane (krok 6) |
| Pracownik widzi tylko swoje wyniki (RB-29) | `assertOwnsResult` | `domain/access.ts` | zrealizowane (krok 2/6) |
| HR tylko dane zagregowane (RB-30) | `anonymizeStressReport` (agregat bez PII) | `domain/anonymize.ts` | zrealizowane (krok 2/6) |
| RODO — wgląd (eksport) | „Eksportuj moje dane" → JSON (profil + ankiety + konsultacje + powiadomienia), bez `hasloHash`/sesji + log | `gdpr.service`, `gdpr.actions` | zrealizowane (krok 6) |
| RODO — poprawienie (rektyfikacja) | edycja profilu (imię/nazwisko/email) + normalizacja e-maila + kontrola unikalności | `user.service.updateMyProfile`, `gdpr.actions` | zrealizowane (krok 6) |
| RODO — usunięcie danych | „Usuń konto" → usunięcie konta (kaskady, audyt zostaje) + log `RODO_USUNIECIE` | `gdpr.service`, `gdpr.actions` | zrealizowane (krok 6) |
| Rejestr zdarzeń bezpieczeństwa | logger bez haseł i pełnych odpowiedzi (typ/login/ip/opis); zdarzenia auth + `DOSTEP_ODMOWA`/`RODO_*` | `authService`, `security.service`, `SecurityEvent` | zrealizowane (krok 4/6) |
| Awaria systemu + telefon pilnej pomocy + log błędów (RB-25/26/27) | error boundary z numerem pomocy | `app/**` (error boundary) | zrealizowane (krok 5) |
| Kopia zapasowa i odtwarzanie | skrypty `db:backup` (`pg_dump -Fc`) / `db:restore` (`pg_restore`) przez kontener `db` | `package.json`, `scripts/` | zrealizowane (krok 7) |
| Szyfrowanie transportu (TLS/HTTPS) | lokalne demo bez hostingu; flaga `secure` cookie gotowa pod HTTPS (sterowana osobnym przełącznikiem, nie `NODE_ENV`) | `lib/session-cookie.ts` | poza zakresem (demo lokalne) |
| Testy penetracyjne | — | — | poza zakresem (poza tematem pracy) |
| Logowanie błędów aplikacji | rejestrowane zdarzenia bezpieczeństwa: błędne/poprawne logowania, blokady, odmowy dostępu, zdarzenia RODO; ogólne błędy aplikacji nie trafiają do `SecurityEvent` | `security.service`, `authService`, `SecurityEvent` | częściowo (zakres zdarzeń bezpieczeństwa) |
| Zawężanie psychologa do konkretnej konsultacji | panele oparte na roli (RBAC); brak reguły „psycholog widzi tylko własne wizyty" | `authService`, panele `app/**` | poza zakresem (minimalne panele) |
| Pełne zarządzanie kontami administratora | rola `ADMIN` + RBAC paneli; brak pełnego CRUD-a użytkowników w UI | `authService`, panel admin | częściowo (minimalny panel admin) |

## 5. Decyzje i ograniczenia zakresu

Poniższe pozycje są **świadomymi decyzjami zakresu** pracy (aplikacja demonstracyjna uruchamiana
lokalnie), a nie brakami implementacyjnymi. Każdą opisano wraz z uzasadnieniem i — gdzie to istotne —
przygotowaniem pod ewentualne wdrożenie produkcyjne.

- **TLS/HTTPS** — demo działa lokalnie przez `docker compose up --build` bez hostingu, więc transport
  nie jest szyfrowany. Aplikacja jest jednak **gotowa pod HTTPS**: atrybut `secure` cookie sesji jest
  sterowany osobnym przełącznikiem (świadomie **nie** przez `NODE_ENV`), więc włączenie go za
  reverse-proxy z TLS nie wymaga zmian w logice.
- **Testy penetracyjne** — poza tematem pracy magisterskiej (skupionej na architekturze 3-warstwowej,
  konteneryzacji, testach jednostkowych i dokumentacji). Zaadresowano natomiast konkretne klasy ryzyk
  na poziomie kodu (hashowanie haseł, blokada konta, anty-enumeracja, CSRF, RBAC, rejestr zdarzeń).
- **Zarządzanie kontami administratora i zawężanie psychologa do konkretnej konsultacji** — panele
  Admin/HR/psycholog są **minimalne**: egzekwują dostęp na poziomie roli (RBAC, `requirePanelRole`),
  ale nie obejmują pełnego CRUD-a użytkowników w UI ani reguły „psycholog widzi wyłącznie własne
  wizyty". To celowe ograniczenie zakresu demo; granice warstw i model danych pozwalają taką regułę
  dołożyć bez zmian architektonicznych.
- **Logowanie błędów aplikacji vs `SecurityEvent`** — rejestr `SecurityEvent` celowo obejmuje
  **zdarzenia bezpieczeństwa** (poprawne/błędne logowania, blokady konta, odmowy dostępu
  `DOSTEP_ODMOWA`, operacje RODO), a nie wszystkie ogólne błędy aplikacji. Awarie warstwy prezentacji
  obsługuje error boundary z numerem pilnej pomocy (RB-25/26/27). Rozdział „audyt bezpieczeństwa"
  od „telemetria błędów" jest świadomy — `SecurityEvent` pozostaje czytelnym śladem audytowym.

## 6. Kopia zapasowa i odtwarzanie bazy

Ręczne narzędzia operacyjne — świadomie **niewpięte** w build ani `entrypoint.sh`, więc nie wpływają
na `docker compose up --build`. Wymagają działającego kontenera `db` (Compose).

| Komenda | Działanie |
|---|---|
| `npm run db:backup` | `pg_dump -Fc` z kontenera `db` → `backups/zenly_<timestamp>.dump` |
| `npm run db:restore -- <plik>` | `pg_restore --clean --if-exists --single-transaction` z pliku do kontenera `db` |

- **Format**: custom (`-Fc`) — kompaktowy, odtwarzany przez `pg_restore`. Oba narzędzia uruchamiane
  **w kontenerze** (`docker compose exec -T db ...`), więc ich wersja zgadza się z Postgres 17; `-T`
  chroni binarny strumień przed zniekształceniem.
- **Dane dostępowe**: z env kontenera (`POSTGRES_USER`/`POSTGRES_DB`) — bez powielania w skrypcie.
- **Pliki**: katalog `backups/` (poza repo — `.gitignore`; w repo zostaje tylko `.gitkeep`).
- **Odtwarzanie nadpisuje** bieżące dane snapshotem z dumpu (`--clean` usuwa i odtwarza obiekty);
  `--single-transaction` czyni operację atomową (wszystko-albo-nic). Na czas restore aplikacja
  powinna być bezczynna (uniknięcie kontencji blokad).
- **Migracje**: dump zawiera tabelę `_prisma_migrations`, więc po odtworzeniu starszego dumpu stan
  migracji odpowiada dumpowi; przy kolejnym `docker compose up` `prisma migrate deploy` dołoży nowsze
  migracje. Seed nie jest uruchamiany przy restore (tylko przy starcie kontenera).

## 7. RODO — prawa osoby, której dane dotyczą

Wymóg („wgląd do własnych danych oraz zgłoszenie prośby o ich poprawienie lub usunięcie") jest
zrealizowany jako self-service na ekranie *Ustawienia → Twoje dane (RODO)*:

| Prawo | Realizacja | Zdarzenie audytu |
|---|---|---|
| Wgląd | „Eksportuj moje dane" → profil + ankiety + konsultacje + powiadomienia jako JSON | `RODO_EKSPORT` |
| Poprawienie (rektyfikacja) | edycja profilu (imię/nazwisko/email) z normalizacją e-maila i kontrolą unikalności | — (świadomie bez `SecurityEvent`) |
| Usunięcie | „Usuń konto" (modal potwierdzenia) → usunięcie z kaskadami; audyt zostaje (`userId`→null) | `RODO_USUNIECIE` |

Eksport nigdy nie zawiera `hasloHash` ani tokenów sesji. Rektyfikacja — w odróżnieniu od eksportu i
usunięcia — **nie** jest rejestrowana jako `SecurityEvent`: w enumie `TypZdarzenia` nie ma wartości
dla aktualizacji profilu, a jej dodanie wymagałoby migracji schematu (świadomy trade-off poza
lean-zakresem Kroków 6–7).
