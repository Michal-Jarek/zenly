import { cache } from "react";
import {
  validateSurveyAnswers,
  sumAnswers,
  calculateStressLevel,
} from "@/server/domain/stress";
import { getRecommendation } from "@/server/domain/recommendation";
import { isSurveyRequired } from "@/server/domain/survey-policy";
import { assertOwnsResult } from "@/server/domain/access";
import {
  ValidationError,
  SurveyNotActiveError,
  NotFoundError,
} from "@/server/domain/errors";
import type { PoziomStresu, TypModulu } from "@/server/domain/types";
import {
  getAnkietaWithPytania,
  getActiveAnkietaWithPytania,
} from "@/server/data/ankieta.repository";
import {
  createWynikWithOdpowiedzi,
  getResultsByUser,
  getResultById,
  getLatestResultByUser,
  getAllResults,
} from "@/server/data/wynik.repository";
import { findUserById } from "@/server/data/user.repository";
import { anonymizeStressReport } from "@/server/domain/anonymize";

/** The active survey to render (id needed for submit; questions carry their text). */
export type ActiveSurvey = {
  id: string;
  tytul: string;
  pytania: { id: string; tresc: string; kolejnosc: number }[];
};

/**
 * Submit a completed stress survey: validate, score, persist the result with its answers,
 * and return the stress level plus recommended modules.
 *
 * @param userId - The employee submitting the survey.
 * @param ankietaId - The survey being answered.
 * @param answers - Positional answers (1..5), one per question ordered by `kolejnosc`.
 * @returns The computed stress level, total score, and recommended module types.
 * @throws {ValidationError} When answers are invalid or do not match the question count.
 * @throws {SurveyNotActiveError} When the survey is missing or inactive.
 */
export async function submitSurvey(
  userId: string,
  ankietaId: string,
  answers: number[],
): Promise<{
  poziomStresu: PoziomStresu;
  sumaPunktow: number;
  recommendation: TypModulu[];
}> {
  const validation = validateSurveyAnswers(answers);
  if (!validation.valid) {
    throw new ValidationError(validation.errors);
  }

  const ankieta = await getAnkietaWithPytania(ankietaId);
  if (!ankieta || !ankieta.aktywna) {
    throw new SurveyNotActiveError();
  }
  // `validateSurveyAnswers` fixes the count at 10 (the seeded survey); this cross-check keeps
  // the positional answer<->question mapping correct should a survey ever have a different size.
  if (ankieta.pytania.length !== answers.length) {
    throw new ValidationError([
      `Survey expects ${ankieta.pytania.length} answers, got ${answers.length}.`,
    ]);
  }

  // Deferred to step 3: RB-07 "one survey per ~month" gating belongs to the submitSurvey Action
  // (it consults `isSurveyDue`); this write path stays unconditional for now.

  const sumaPunktow = sumAnswers(answers);
  const poziomStresu = calculateStressLevel(sumaPunktow);
  const odpowiedzi = ankieta.pytania.map((pytanie, index) => ({
    pytanieId: pytanie.id,
    wartosc: answers[index],
  }));

  await createWynikWithOdpowiedzi({
    userId,
    ankietaId,
    sumaPunktow,
    poziomStresu,
    odpowiedzi,
  });

  return { poziomStresu, sumaPunktow, recommendation: getRecommendation(poziomStresu) };
}

/**
 * List all survey results for a user. The query is scoped to `userId`, so it returns only
 * that user's results — the caller must pass the authenticated user's id (enforced by the
 * transport/RBAC layer in later steps).
 *
 * @param userId - The authenticated user whose results to list.
 * @returns The user's survey results, newest first.
 */
// Request-memoized (React cache): the (app) layout's RB-06 gate and the dashboard page both read
// this in the same request — cache() collapses them to a single query.
export const getMyResults = cache((userId: string) => getResultsByUser(userId));

/**
 * Fetch a single survey result, enforcing owner-only access (RB-29).
 *
 * @param userId - The requesting user.
 * @param wynikId - The result to fetch.
 * @returns The survey result.
 * @throws {NotFoundError} When the user or the result does not exist.
 * @throws {AccessDeniedError} When the user does not own the result.
 */
export async function getResult(userId: string, wynikId: string) {
  const user = await findUserById(userId);
  if (!user) {
    throw new NotFoundError("User not found.");
  }
  const wynik = await getResultById(wynikId);
  if (!wynik) {
    throw new NotFoundError("Survey result not found.");
  }
  assertOwnsResult(user, wynik);
  return wynik;
}

/**
 * Decide whether the user is due for a new stress survey (RB-07).
 *
 * @param userId - The user to check.
 * @param now - The reference "current" time.
 * @returns `true` when a new survey is required.
 */
export async function isSurveyDue(userId: string, now: Date): Promise<boolean> {
  const latest = await getLatestResultByUser(userId);
  return isSurveyRequired(latest?.dataWypelnienia ?? null, now);
}

/**
 * Fetch the active survey (id + questions with text) to render the survey form.
 *
 * @returns The active survey, or `null` when none is active.
 */
export function getActiveSurvey(): Promise<ActiveSurvey | null> {
  return getActiveAnkietaWithPytania();
}

/**
 * Anonymized stress-level aggregate across all results, for HR (RB-30). No PII.
 *
 * @returns Counts per stress level and the total.
 */
export async function getStressReport(): Promise<{
  low: number;
  medium: number;
  high: number;
  total: number;
}> {
  const results = await getAllResults();
  return anonymizeStressReport(results);
}
