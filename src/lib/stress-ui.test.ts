import { describe, it, expect } from "vitest";
import {
  stressView,
  deriveTrend,
  trendMessage,
  trendBorderClass,
} from "@/lib/stress-ui";

describe("stressView (level -> label/colour)", () => {
  it("maps LOW to a green 'Niski'", () => {
    const v = stressView("LOW");
    expect(v.label).toBe("Niski");
    expect(v.textClass).toContain("green");
  });

  it("maps MEDIUM to an amber 'Umiarkowany'", () => {
    const v = stressView("MEDIUM");
    expect(v.label).toBe("Umiarkowany");
    expect(v.textClass).toContain("amber");
  });

  it("maps HIGH to a red 'Wysoki'", () => {
    const v = stressView("HIGH");
    expect(v.label).toBe("Wysoki");
    expect(v.textClass).toContain("red");
  });
});

describe("deriveTrend (latest vs previous)", () => {
  it("returns null with fewer than two results", () => {
    expect(deriveTrend([])).toBeNull();
    expect(deriveTrend(["MEDIUM"])).toBeNull();
  });

  it("returns 'lower' when stress dropped (newest first)", () => {
    expect(deriveTrend(["LOW", "HIGH"])).toBe("lower");
    expect(deriveTrend(["MEDIUM", "HIGH", "LOW"])).toBe("lower");
  });

  it("returns 'higher' when stress rose", () => {
    expect(deriveTrend(["HIGH", "LOW"])).toBe("higher");
  });

  it("returns 'same' when unchanged", () => {
    expect(deriveTrend(["MEDIUM", "MEDIUM"])).toBe("same");
  });
});

describe("trend message + border", () => {
  it("uses a green border and a positive message when lower", () => {
    expect(trendBorderClass("lower")).toContain("green");
    expect(trendMessage("lower")).toMatch(/niższy/);
  });

  it("uses a red border when higher", () => {
    expect(trendBorderClass("higher")).toContain("red");
    expect(trendMessage("higher")).toMatch(/wyższy/);
  });
});
