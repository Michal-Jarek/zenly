import { getRecommendation } from "@/server/domain/recommendation";
import type { PoziomStresu, TypModulu } from "@/server/domain/types";
import { getModulyByTypy } from "@/server/data/modul.repository";

// Deferred trade-off (step 5): read-only services return Prisma-inferred row types
// (e.g. `moduly` below). Explicit return DTOs will be introduced when the UI consumes these,
// to stop generated types leaking into the presentation layer — see health.service.ts for the
// DTO pattern. ESLint guards the import boundary; the type flow is a conscious step-2 choice.

/**
 * Resolve a stress level into recommended module types and their content modules.
 * For HIGH the recommendation is `KONSULTACJA` — a call-to-action with no content module,
 * so `moduly` is empty by design.
 *
 * @param level - The stress level.
 * @returns The recommended module types and the matching content modules (with resources).
 */
export async function getRecommendationForLevel(level: PoziomStresu): Promise<{
  typy: TypModulu[];
  moduly: Awaited<ReturnType<typeof getModulyByTypy>>;
}> {
  const typy = getRecommendation(level);
  const moduly = await getModulyByTypy(typy);
  return { typy, moduly };
}
