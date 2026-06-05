import type { PoziomStresu } from "@/server/domain/types";

/**
 * Aggregate survey results into stress-level counts for HR (RB-30).
 * The output contains only counts — no user identity or individual scores (no PII).
 *
 * @param results - Survey results, each carrying only its stress level.
 * @returns Counts per level and the total (`total === low + medium + high`).
 */
export function anonymizeStressReport(
  results: { poziomStresu: PoziomStresu }[],
): { low: number; medium: number; high: number; total: number } {
  const report = { low: 0, medium: 0, high: 0, total: results.length };

  for (const { poziomStresu } of results) {
    if (poziomStresu === "LOW") report.low++;
    else if (poziomStresu === "MEDIUM") report.medium++;
    else report.high++;
  }

  return report;
}
