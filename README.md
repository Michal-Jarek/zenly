# Zenly

Aplikacja webowa do interwencji psychologicznych przeciw stresowi w pracy.
Architektura **trójwarstwowa** (prezentacja / logika biznesowa / dane), uruchamiana lokalnie
jedną komendą przez Docker Compose.

> Status: **krok 0** — szkielet + działający `docker compose up --build` z Postgresem,
> minimalna schema (`User`) + migracja + seed. Kolejne kroki rozwijają model, logikę,
> testy, własną sesję auth i UI z makiet.

## Uruchomienie (jedna komenda)

```bash
docker compose up --build
```

Co się dzieje automatycznie:
1. wstaje **Postgres 17** z healthcheckiem,
2. aplikacja czeka na zdrową bazę (`depends_on: service_healthy`),
3. `prisma migrate deploy` → `prisma db seed` → start serwera,
4. aplikacja dostępna na **http://localhost:3000**.

Strona główna pokazuje status bazy i liczbę użytkowników z seeda (dowód, że łańcuch
migracja → seed → start zadziałał w kontenerze).

Dane z seeda (krok 0): login `admin`, e-mail `admin@zenly.local`.

## Warstwy (mapowanie na katalogi)

| Warstwa | Katalog | Zasada |
|---|---|---|
| Prezentacja | `src/app/**` | nigdy nie importuje `@prisma/client` |
| Transport (Server Actions) | `src/server/actions/**` | wywołuje logikę, nie bazę |
| Logika biznesowa | `src/server/domain/**`, `src/server/services/**` | jedyna warstwa sięgająca do danych |
| Dane (Prisma) | `src/server/data/**` | jedyna warstwa importująca `@prisma/client` |

Granica jest wymuszana regułą ESLint (`no-restricted-imports`) — `npm run lint`.

## Skrypty

| Komenda | Opis |
|---|---|
| `docker compose up --build` | pełne uruchomienie (baza + app + migracje + seed) |
| `npm run test` | testy jednostkowe (Vitest) |
| `npm run lint` | lint + reguła granic warstw |
| `npm run dev` | tryb deweloperski (wymaga lokalnej bazy / `.env`) |

## Stack

Next.js 15 (App Router, TypeScript, Server Actions) · React 19 · Tailwind CSS 3 ·
Prisma 6 + PostgreSQL 17 · własna sesja auth (bcryptjs) · Vitest · Docker Compose.
Uzasadnienie doboru wersji — w dokumentacji
technicznej (`docs/`), uzupełniane w kolejnych krokach.
