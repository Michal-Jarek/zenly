import { describe, it, expect } from "vitest";
import { anonymizeStressReport } from "@/server/domain/anonymize";

describe("anonymizeStressReport (RB-30)", () => {
  it("returns all zeros for an empty input", () => {
    expect(anonymizeStressReport([])).toEqual({ low: 0, medium: 0, high: 0, total: 0 });
  });

  it("counts results per level without exposing PII", () => {
    const report = anonymizeStressReport([
      { poziomStresu: "LOW" },
      { poziomStresu: "MEDIUM" },
      { poziomStresu: "MEDIUM" },
      { poziomStresu: "HIGH" },
    ]);

    expect(report).toEqual({ low: 1, medium: 2, high: 1, total: 4 });
    // Output carries only counts — no identity, score, or date fields.
    expect(Object.keys(report).sort()).toEqual(["high", "low", "medium", "total"]);
    expect(report.total).toBe(report.low + report.medium + report.high);
  });
});
