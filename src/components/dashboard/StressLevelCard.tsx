import type { PoziomStresu } from "@/server/domain/types";
import { stressView } from "@/lib/stress-ui";
import { Card } from "@/components/Card";

/** "Obecny poziom stresu: {label}" with the level's colour. */
export function StressLevelCard({ level }: { level: PoziomStresu }) {
  const view = stressView(level);
  return (
    <Card>
      <p className="text-xl font-semibold">
        Obecny poziom stresu:{" "}
        <span className={view.textClass}>{view.label}</span>
      </p>
    </Card>
  );
}
