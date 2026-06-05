import type { PoziomStresu } from "@/server/domain/types";

const SURVEY_LENGTH = 10;
const MIN_ANSWER = 1;
const MAX_ANSWER = 5;
const LOW_MAX = 10; // RB-09: score <= 10 is LOW
const MEDIUM_MAX = 20; // RB-09: score 11..20 is MEDIUM, above is HIGH

/**
 * Sum the numeric answers of a stress survey.
 *
 * @param answers - Likert answers (each 1..5); an empty array sums to 0.
 * @returns The total score.
 */
export function sumAnswers(answers: number[]): number {
  return answers.reduce((total, value) => total + value, 0);
}

/**
 * Map a raw survey score to a stress level (RB-09).
 * Thresholds: `<= 10` LOW, `11..20` MEDIUM, `> 20` HIGH.
 *
 * @param sum - The raw survey score.
 * @returns The corresponding stress level.
 */
export function calculateStressLevel(sum: number): PoziomStresu {
  if (sum <= LOW_MAX) return "LOW";
  if (sum <= MEDIUM_MAX) return "MEDIUM";
  return "HIGH";
}

/**
 * Validate the answers of a stress survey: exactly 10 answers, each an integer in 1..5.
 *
 * @param answers - The submitted answers.
 * @returns `valid` plus a list of human-readable error messages (empty when valid).
 */
export function validateSurveyAnswers(answers: number[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (answers.length !== SURVEY_LENGTH) {
    errors.push(`Survey must have exactly ${SURVEY_LENGTH} answers, got ${answers.length}.`);
  }

  answers.forEach((value, index) => {
    if (!Number.isInteger(value) || value < MIN_ANSWER || value > MAX_ANSWER) {
      errors.push(
        `Answer ${index + 1} must be an integer in ${MIN_ANSWER}..${MAX_ANSWER}, got ${value}.`,
      );
    }
  });

  return { valid: errors.length === 0, errors };
}
