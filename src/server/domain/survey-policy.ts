const MS_PER_DAY = 24 * 60 * 60 * 1000;
const SURVEY_INTERVAL_DAYS = 30;

/**
 * Decide whether a stress survey is due (RB-07): required when never taken, or when
 * more than ~1 month (30 days) has passed since the last one.
 *
 * @param last - Date of the last completed survey, or `null` if none.
 * @param now - The reference "current" time (injected for determinism).
 * @returns `true` when a new survey is required.
 */
export function isSurveyRequired(last: Date | null, now: Date): boolean {
  if (last === null) return true;
  return now.getTime() - last.getTime() > SURVEY_INTERVAL_DAYS * MS_PER_DAY;
}
