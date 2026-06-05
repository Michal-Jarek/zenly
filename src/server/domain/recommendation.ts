import type { PoziomStresu, TypModulu } from "@/server/domain/types";

/**
 * Recommend intervention modules for a stress level (RB-11/12/13).
 * LOW → breathing; MEDIUM → music + exercises + meditation; HIGH → consultation.
 *
 * @param lvl - The stress level.
 * @returns The recommended module types. `KONSULTACJA` is a call-to-action (no content module).
 */
export function getRecommendation(lvl: PoziomStresu): TypModulu[] {
  switch (lvl) {
    case "LOW":
      return ["ODDECH"];
    case "MEDIUM":
      return ["MUZYKA", "CWICZENIA", "MEDYTACJA"];
    case "HIGH":
      return ["KONSULTACJA"];
  }
}
