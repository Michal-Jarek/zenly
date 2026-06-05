import { describe, it, expect } from "vitest";
import {
  sumAnswers,
  calculateStressLevel,
  validateSurveyAnswers,
} from "@/server/domain/stress";

describe("sumAnswers", () => {
  it("sums the answers", () => {
    expect(sumAnswers([1, 2, 3, 4, 5])).toBe(15);
  });

  it("returns 0 for an empty array", () => {
    expect(sumAnswers([])).toBe(0);
  });
});

describe("calculateStressLevel (RB-09)", () => {
  it("maps representative scores", () => {
    expect(calculateStressLevel(8)).toBe("LOW");
    expect(calculateStressLevel(11)).toBe("MEDIUM");
    expect(calculateStressLevel(25)).toBe("HIGH");
  });

  it("maps the threshold boundaries", () => {
    expect(calculateStressLevel(10)).toBe("LOW");
    expect(calculateStressLevel(11)).toBe("MEDIUM");
    expect(calculateStressLevel(20)).toBe("MEDIUM");
    expect(calculateStressLevel(21)).toBe("HIGH");
  });
});

describe("validateSurveyAnswers", () => {
  it("rejects fewer or more than 10 answers", () => {
    expect(validateSurveyAnswers(Array(9).fill(3)).valid).toBe(false);
    expect(validateSurveyAnswers(Array(11).fill(3)).valid).toBe(false);
  });

  it("rejects out-of-range values (0 and 6)", () => {
    const withZero = [0, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    const withSix = [6, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    expect(validateSurveyAnswers(withZero).valid).toBe(false);
    expect(validateSurveyAnswers(withSix).valid).toBe(false);
  });

  it("accepts exactly 10 answers in 1..5", () => {
    const ok = [1, 2, 3, 4, 5, 1, 2, 3, 4, 5];
    const result = validateSurveyAnswers(ok);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
