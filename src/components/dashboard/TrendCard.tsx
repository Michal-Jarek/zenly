import { type Trend, trendMessage, trendBorderClass } from "@/lib/stress-ui";

/** Coloured trend card (green when stress dropped). Rendered only when a trend exists (>=2 results). */
export function TrendCard({ trend }: { trend: Trend }) {
  return (
    <div className={`rounded-2xl border-2 bg-white p-6 shadow-sm ${trendBorderClass(trend)}`}>
      <p className="text-xl font-semibold">{trendMessage(trend)}</p>
    </div>
  );
}
