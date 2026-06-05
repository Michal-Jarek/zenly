import { describe, it, expect } from "vitest";
import { getRecommendation } from "@/server/domain/recommendation";

describe("getRecommendation (RB-11/12/13)", () => {
  it("LOW recommends breathing", () => {
    expect(getRecommendation("LOW")).toEqual(["ODDECH"]);
  });

  it("MEDIUM recommends music, exercises and meditation (in order)", () => {
    expect(getRecommendation("MEDIUM")).toEqual(["MUZYKA", "CWICZENIA", "MEDYTACJA"]);
  });

  it("HIGH recommends a consultation", () => {
    expect(getRecommendation("HIGH")).toEqual(["KONSULTACJA"]);
  });
});
