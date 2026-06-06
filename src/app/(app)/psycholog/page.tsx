import { requirePanelRole } from "@/server/services/auth.service";
import { Card } from "@/components/Card";

export const dynamic = "force-dynamic";

export default async function PsychologPage() {
  await requirePanelRole(["PSYCHOLOGIST"]);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-3xl font-bold">Panel psychologa</h1>
      <Card>
        <p className="text-neutral-500">
          Zarządzanie konsultacjami i kalendarzem będzie dostępne wkrótce.
        </p>
      </Card>
    </div>
  );
}
