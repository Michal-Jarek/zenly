import type { ModuleView } from "@/server/services/modul.service";
import { Card } from "@/components/Card";

type Zasob = ModuleView["zasoby"][number];

function ResourceList({ label, zasoby }: { label: string; zasoby: Zasob[] }) {
  return (
    <Card>
      <h2 className="text-lg font-medium text-neutral-700">{label}</h2>
      {zasoby.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-400">Brak materiałów.</p>
      ) : (
        <ul className="mt-3 list-disc pl-5">
          {zasoby.map((z) => (
            <li key={z.id} className="py-0.5">
              <a
                href={z.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {z.etykieta}
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/**
 * A content-module page: title, intro card, then resources — two columns split by band
 * (5–10 / 15–30 min) or a single column (music). Reused by oddech/medytacja/cwiczenia/muzyka.
 */
export function ModuleScreen({
  title,
  emoji,
  paragraphs,
  zasoby,
  shortLabel,
  longLabel,
  singleLabel,
}: {
  title: string;
  emoji: string;
  paragraphs: string[];
  zasoby: Zasob[];
  shortLabel?: string;
  longLabel?: string;
  singleLabel?: string;
}) {
  const short = zasoby.filter((z) => z.pasmo === "SHORT_5_10");
  const long = zasoby.filter((z) => z.pasmo === "LONG_15_30");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">{title}</h1>

      <Card>
        <p className="font-medium">
          <span aria-hidden="true" className="mr-2">
            {emoji}
          </span>
          {paragraphs[0]}
        </p>
        {paragraphs.slice(1).map((p, i) => (
          <p key={i} className="mt-3 text-neutral-700">
            {p}
          </p>
        ))}
      </Card>

      {singleLabel ? (
        <ResourceList label={singleLabel} zasoby={zasoby} />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <ResourceList label={shortLabel ?? "Sesje 5-10 minut"} zasoby={short} />
          <ResourceList label={longLabel ?? "Sesje 15-30 minut"} zasoby={long} />
        </div>
      )}
    </div>
  );
}
