import { describe, it, expect } from "vitest";
import { isSurveyRequired } from "@/server/domain/survey-policy";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-06-06T12:00:00.000Z");

function daysBefore(now: Date, days: number): Date {
  return new Date(now.getTime() - days * MS_PER_DAY);
}

describe("isSurveyRequired (RB-07)", () => {
  it("requires a survey when none was ever taken", () => {
    expect(isSurveyRequired(null, NOW)).toBe(true);
  });

  it("does not require a survey 15 days after the last one", () => {
    expect(isSurveyRequired(daysBefore(NOW, 15), NOW)).toBe(false);
  });

  it("requires a survey 35 days after the last one", () => {
    expect(isSurveyRequired(daysBefore(NOW, 35), NOW)).toBe(true);
  });

  it("treats the 30-day mark as not yet due (strict >)", () => {
    expect(isSurveyRequired(daysBefore(NOW, 30), NOW)).toBe(false);
  });
});
