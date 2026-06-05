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
import { getAnkietaWithPytania } from "@/server/data/ankieta.repository";
import {
  createWynikWithOdpowiedzi,
  getResultsByUser,
  getResultById,
  getLatestResultByUser,
} from "@/server/data/wynik.repository";
import { findUserById } from "@/server/data/user.repository";

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
export function getMyResults(userId: string) {
  return getResultsByUser(userId);
}

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
