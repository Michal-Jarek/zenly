# Zenly

Aplikacja webowa do interwencji psychologicznych przeciw stresowi w pracy.
Architektura **trójwarstwowa** (prezentacja / logika biznesowa / dane), uruchamiana lokalnie
jedną komendą przez Docker Compose.

Pracownik wypełnia okresową ankietę stresu, otrzymuje poziom (LOW/MEDIUM/HIGH) wraz z rekomendacją
modułów relaksacyjnych (oddech / medytacja / ćwiczenia / muzyka) lub konsultacji z psychologiem.
Aplikacja obejmuje własną sesję uwierzytelnienia, role (EMPLOYEE/PSYCHOLOGIST/HR/ADMIN), realizację
praw RODO oraz kopię zapasową i odtwarzanie bazy.

> Stan: kompletna aplikacja 3-warstwowa — pełny model danych (Prisma + migracje + seed),
> logika domenowa z testami (Vitest), własna sesja auth, UI z makiet, RBAC, RODO, rejestr zdarzeń
> bezpieczeństwa oraz backup/restore. Całość startuje jedną komendą `docker compose up --build`.

Dokumentacja techniczna (deliverable do PDF): [`docs/dokumentacja-techniczna.md`](docs/dokumentacja-techniczna.md).
Diagram ERD (auto-generowany): [`docs/ERD.md`](docs/ERD.md).

## Uruchomienie (jedna komenda)

```bash
docker compose up --build
```

Co się dzieje automatycznie:
1. wstaje **Postgres 17** z healthcheckiem,
2. aplikacja czeka na zdrową bazę (`depends_on: service_healthy`),
3. `prisma migrate deploy` → `prisma db seed` → start serwera (`next start`),
4. aplikacja dostępna na **http://localhost:3000**.

Strona główna pokazuje status bazy i liczbę użytkowników z seeda (dowód, że łańcuch
migracja → seed → start zadziałał w kontenerze).

## Dane logowania (konta z seeda)

Seed (`prisma/seed.ts`) tworzy po jednym koncie na rolę. **Wszystkie** używają tego samego hasła
demonstracyjnego (spełnia politykę: ≥12 znaków, mała/wielka litera, cyfra, znak specjalny):

```
Hasło: Zenly!Demo2026#Pass
```

| Login | Rola | Osoba |
|---|---|---|
| `admin` | ADMIN | Anna Adminowska |
| `hr` | HR | Halina Rekrutacka |
| `psycholog1` | PSYCHOLOGIST | Piotr Kojarski |
| `pracownik1` | EMPLOYEE | Ewa Kowalska |
| `pracownik2` | EMPLOYEE | Marek Nowak |

Logowanie odbywa się po **loginie** (nie e-mailu). Dane demo są zależne od czasu (m.in. zaległa ankieta
> 1 mies. dla `pracownik1`, trend ≥ 2 wyników dla `pracownik2`) — uwidaczniają gating ankiety i raport HR.

## Architektura — warstwy (mapowanie na katalogi)

| Warstwa | Katalog | Zasada |
|---|---|---|
| Prezentacja | `src/app/**` (strony + komponenty) | nigdy nie importuje `@prisma/client` |
| Transport (Server Actions) | `src/server/actions/**` | wywołuje logikę, nie bazę |
| Logika biznesowa | `src/server/domain/**` (czyste funkcje), `src/server/services/**` (orkiestracja + RBAC) | jedyna warstwa sięgająca do danych |
| Dane (Prisma) | `src/server/data/**` | jedyna warstwa importująca `@prisma/client` |

Reguła „dostęp do bazy wyłącznie przez logikę" jest **wymuszana** regułą ESLint
(`no-restricted-imports`): `@prisma/client` wolno importować tylko w `src/server/data/**`, a warstwę
danych — tylko z `src/server/services/**`. Reguła stanowi formalny, sprawdzalny dowód granic
architektonicznych (`npm run lint`). Szczegóły, ERD i schemat bazy:
[`docs/dokumentacja-techniczna.md`](docs/dokumentacja-techniczna.md).

## Skrypty

| Komenda | Opis |
|---|---|
| `docker compose up --build` | pełne uruchomienie (baza + app + migracje + seed) |
| `npm run dev` | tryb deweloperski (wymaga lokalnej bazy / `.env`) |
| `npm run build` | produkcyjny build Next.js |
| `npm run start` | uruchomienie zbudowanej aplikacji (`next start`) |
| `npm run test` | testy jednostkowe (Vitest, jednorazowo) |
| `npm run test:watch` | testy w trybie watch |
| `npm run lint` | lint + reguła granic warstw (`no-restricted-imports`) |
| `npm run db:migrate` | migracja deweloperska (`prisma migrate dev`) |
| `npm run db:deploy` | aplikacja migracji w środowisku docelowym (`prisma migrate deploy`) |
| `npm run db:seed` | wypełnienie bazy danymi demo (`prisma db seed`) |
| `npm run db:studio` | przeglądarka danych (`prisma studio`) |
| `npm run db:erd` | regeneracja diagramu ERD → `docs/ERD.md` (Mermaid) |
| `npm run db:backup` | kopia zapasowa bazy (`pg_dump -Fc` → `backups/`) |
| `npm run db:restore -- <plik>` | odtworzenie bazy z dumpu (`pg_restore`) |

## Stack i uzasadnienie doboru

Next.js 15 (App Router, TypeScript, Server Actions) · React 19 · Tailwind CSS 3 · Prisma 6 +
PostgreSQL 17 · własna sesja auth (bcryptjs) · Vitest · Docker Compose.

- **Wersje stabilne, wzajemnie kompatybilne.** Next 15 + React 19 to bieżąca linia LTS-owa Next
  z natywnym wsparciem Server Actions (warstwa transportu bez osobnego REST API). Tailwind **3**
  (nie 4) — dojrzały, stabilny pipeline PostCSS bez ryzyka świeżej dużej zmiany majora. Prisma **6**
  + PostgreSQL **17** — aktualne, długo wspierane wersje ORM i bazy; Node **22** (obraz bazowy).
- **bcryptjs** (czysty JS, bez natywnej kompilacji) — hashowanie haseł działa identycznie lokalnie
  i w obrazie Dockera, bez zależności od toolchainu systemowego.
- **Własna sesja auth (bez biblioteki).** Świadoma decyzja architektoniczna: encja sesji
  (`SesjaUzytkownika`) jest mapowana **1:1** z modelu, a uwierzytelnianie przechodzi w całości przez
  warstwę logiki (`src/server/services/auth.service.ts`) — zgodnie z regułą „dostęp do danych tylko
  przez logikę". Cookie nosi surowy token, w bazie trzymany jest jego skrót **SHA-256**; hasła
  wyłącznie jako hash bcrypt (cost 12); blokada konta po 5 nieudanych próbach na 15 min; porównanie
  z atrapą hasła przeciw enumeracji kont. Pełny opis: sekcja bezpieczeństwa w dokumentacji technicznej.

## Dokumentacja

- [`docs/dokumentacja-techniczna.md`](docs/dokumentacja-techniczna.md) — architektura 3-warstwowa,
  model danych (ERD), schemat bazy, tabela realizacji wymagań bezpieczeństwa, decyzje i ograniczenia
  zakresu, backup/odtwarzanie, RODO.
- [`docs/ERD.md`](docs/ERD.md) — diagram związków encji (Mermaid), generowany z `prisma/schema.prisma`
  (`npm run db:erd`).
