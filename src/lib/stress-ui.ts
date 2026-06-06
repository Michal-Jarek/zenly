import type { PoziomStresu } from "@/server/domain/types";

/** Presentation view of a stress level: Polish label + Tailwind colour classes. */
export type StressView = {
  label: string;
  textClass: string;
  borderClass: string;
  dotClass: string;
};

const STRESS_VIEWS: Record<PoziomStresu, StressView> = {
  LOW: {
    label: "Niski",
    textClass: "text-green-600",
    borderClass: "border-green-500",
    dotClass: "bg-green-500",
  },
  MEDIUM: {
    label: "Umiarkowany",
    textClass: "text-amber-500",
    borderClass: "border-amber-400",
    dotClass: "bg-amber-400",
  },
  HIGH: {
    label: "Wysoki",
    textClass: "text-red-600",
    borderClass: "border-red-500",
    dotClass: "bg-red-500",
  },
};

/** Map a stress level to its label + colour classes. */
export function stressView(level: PoziomStresu): StressView {
  return STRESS_VIEWS[level];
}

/** Direction of the stress trend versus the previous survey. */
export type Trend = "lower" | "higher" | "same";

const RANK: Record<PoziomStresu, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };

/**
 * Compare the latest stress level to the previous one. Returns `null` when there are
 * fewer than two results (no trend to show).
 *
 * @param levelsNewestFirst - Stress levels ordered newest-first.
 */
export function deriveTrend(levelsNewestFirst: PoziomStresu[]): Trend | null {
  if (levelsNewestFirst.length < 2) return null;
  const [latest, previous] = levelsNewestFirst;
  if (RANK[latest] < RANK[previous]) return "lower";
  if (RANK[latest] > RANK[previous]) return "higher";
  return "same";
}

/** Polish message for a trend (the green/red/neutral dashboard card). */
export function trendMessage(trend: Trend): string {
  switch (trend) {
    case "lower":
      return "Twój poziom stresu jest niższy, niż w ostatnim miesiącu!";
    case "higher":
      return "Twój poziom stresu jest wyższy, niż w ostatnim miesiącu.";
    case "same":
      return "Twój poziom stresu jest podobny do ostatniego miesiąca.";
  }
}

/** Tailwind border colour for a trend card. */
export function trendBorderClass(trend: Trend): string {
  switch (trend) {
    case "lower":
      return "border-green-500";
    case "higher":
      return "border-red-500";
    case "same":
      return "border-neutral-300";
  }
}
