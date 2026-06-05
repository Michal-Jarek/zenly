import { getStatus } from "@/server/services/health.service";

// Rendered per request so the DB is read at runtime (in the container), not at build time.
export const dynamic = "force-dynamic";

export default async function Home() {
  const status = await getStatus();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-6xl font-bold tracking-tight">Zenly.</h1>
      <p className="text-neutral-600">Krok 0 — szkielet + Docker Compose + Postgres.</p>
      <div className="rounded-xl border border-neutral-200 bg-white px-5 py-3 text-sm shadow-sm">
        Baza danych: <span className="font-semibold text-green-600">OK</span>
        {"  ·  "}
        użytkowników w bazie: <span className="font-semibold">{status.users}</span>
      </div>
    </main>
  );
}
