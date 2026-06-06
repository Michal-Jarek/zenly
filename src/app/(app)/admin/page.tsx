import { redirect } from "next/navigation";
import { requireUser } from "@/server/services/auth.service";
import { getStatus } from "@/server/services/health.service";
import { Card } from "@/components/Card";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await requireUser();
  if (session.rola !== "ADMIN") redirect("/dashboard");

  const status = await getStatus();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-3xl font-bold">Panel administratora</h1>
      <Card>
        <p className="text-lg">
          Liczba użytkowników:{" "}
          <span className="font-semibold">{status.users}</span>
        </p>
      </Card>
    </div>
  );
}
