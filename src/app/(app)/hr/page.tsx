import { redirect } from "next/navigation";
import { requireUser } from "@/server/services/auth.service";
import { getStressReport } from "@/server/services/survey.service";
import { Card } from "@/components/Card";

export const dynamic = "force-dynamic";

export default async function HrPage() {
  const session = await requireUser();
  if (session.rola !== "HR") redirect("/dashboard");

  const report = await getStressReport();

  const rows = [
    { label: "Niski", value: report.low, className: "text-green-600" },
    { label: "Umiarkowany", value: report.medium, className: "text-amber-500" },
    { label: "Wysoki", value: report.high, className: "text-red-600" },
  ];

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-3xl font-bold">Panel HR</h1>
      <Card>
        <h2 className="text-lg font-semibold">Rozkład poziomów stresu (anonimowo)</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Zagregowane wyniki bez danych osobowych — łącznie {report.total} wypełnień.
        </p>
        <ul className="mt-4 flex flex-col gap-2">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center justify-between">
              <span>{r.label}</span>
              <span className={`text-xl font-bold ${r.className}`}>{r.value}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
