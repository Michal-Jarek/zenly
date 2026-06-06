import type { UpcomingConsultation } from "@/server/services/consultation.service";
import { formatConsultationWhen } from "@/lib/format";
import { Card } from "@/components/Card";

/** "Nadchodzące konsultacje" — the user's next booked slots (or an empty state). */
export function UpcomingConsultationsCard({
  items,
}: {
  items: UpcomingConsultation[];
}) {
  return (
    <Card>
      <h2 className="text-lg font-semibold">Nadchodzące konsultacje</h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-500">Brak nadchodzących konsultacji.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {items.map((c) => {
            const when = formatConsultationWhen(c.poczatek, c.koniec);
            return (
              <li key={c.id} className="text-lg">
                <span aria-hidden="true">🕐</span> {when.day}
                <br />
                {when.time}
                <span className="block text-sm text-neutral-500">
                  {c.psychologImie} {c.psychologNazwisko}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
