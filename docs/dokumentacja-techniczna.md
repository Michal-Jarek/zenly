# Zenly — dokumentacja techniczna

Aplikacja webowa do interwencji psychologicznych przeciw stresowi w pracy. Architektura
trójwarstwowa, uruchamiana lokalnie jedną komendą (`docker compose up --build`):
Next.js + PostgreSQL + Docker Compose.

> Ten dokument jest deliverable'em (materiał do oddawanego PDF). Zawiera: architekturę
> warstw, model danych (ERD), schemat bazy oraz tabelę zakresu realizacji wymagań
> bezpieczeństwa. Uzupełniany w kolejnych krokach implementacji.

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

| Wymaganie | Realizacja | Warstwa / miejsce | Status |
|---|---|---|---|
| Hasła wyłącznie zahashowane (RB-04) | bcryptjs (hash/compare) | `authService` | planowane (krok 4) |
| Silna polityka hasła | `validatePasswordStrength` (≥12 zn., mała/wielka/cyfra/specjalny) | `domain/password.ts` | planowane (krok 2) |
| Blokada konta po 5 nieudanych próbach | `shouldLockAccount` → `failedLoginCount`/`lockedUntil` + log | `domain/account-lock.ts`, `authService` | planowane (krok 2/4) |
| Bezpieczna sesja | własna sesja: surowy token w cookie, SHA-256 w DB; `koniec` zamyka sesję | `SesjaUzytkownika`, `authService`, `lib/session-cookie.ts` | planowane (krok 4) |
| Atrybuty cookie | httpOnly + sameSite=lax + secure (prod) + maxAge | `lib/session-cookie.ts` | planowane (krok 4) |
| Ochrona CSRF | sameSite=lax + sprawdzenie Origin/Host w Server Actions | `lib/csrf.ts` | planowane (krok 3/4) |
| Kontrola dostępu (RBAC) | `requireUser(roles)` + `middleware.ts` (presence cookie, edge-safe) | `authService`, `middleware.ts` | planowane (krok 4/6) |
| Pracownik widzi tylko swoje wyniki (RB-29) | `assertOwnsResult` | `domain/access.ts` | planowane (krok 2/6) |
| HR tylko dane zagregowane (RB-30) | `anonymizeStressReport` (agregat bez PII) | `domain/anonymize.ts` | planowane (krok 2/6) |
| RODO — eksport i usunięcie danych | eksport JSON + usunięcie konta (kaskady) + log | `gdpr.service` | planowane (krok 6) |
| Rejestr zdarzeń bezpieczeństwa | logger bez haseł i pełnych odpowiedzi (typ/suma/poziom) | `security.service`, `SecurityEvent` | planowane (krok 6) |
| Awaria systemu + telefon pilnej pomocy + log błędów (RB-25/26/27) | error boundary z numerem pomocy | `app/**` (error boundary) | planowane (krok 5) |
| Kopia zapasowa i odtwarzanie | skrypty `db:backup` (pg_dump) / `db:restore` (pg_restore) | `package.json` / skrypty | planowane (krok 7) |

### Poza zakresem (tylko opis)
TLS/HTTPS, testy penetracyjne, zawężanie psychologa do konkretnej konsultacji, pełne zarządzanie kontami administratora.
