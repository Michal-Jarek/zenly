"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { ok, fail, toActionError, type ActionResult } from "@/lib/action-result";
import { assertSameOrigin } from "@/lib/csrf";
import { getCurrentUserId } from "@/lib/current-user";
import { submitSurvey, isSurveyDue } from "@/server/services/survey.service";
import type { PoziomStresu, TypModulu } from "@/server/domain/types";

const SubmitSurveySchema = z.object({
  ankietaId: z.string().min(1),
  answers: z.array(z.number().int().min(1).max(5)).length(10),
});

type SubmitSurveyData = {
  poziomStresu: PoziomStresu;
  sumaPunktow: number;
  recommendation: TypModulu[];
};

/**
 * Submit a completed stress survey. Thin transport: same-origin guard, shape validation, the
 * RB-07 "due" gate, then delegate scoring/persistence to the service.
 *
 * The RB-07 gate is a business outcome (not an exception): when the user is not due, the write is
 * refused with `SURVEY_NOT_DUE` and the service is never called.
 *
 * The gate is advisory (check-then-act): concurrent submits are not hardened — `WynikAnkiety` has no
 * unique constraint — so a double-click / two-tab race could write twice. Acceptable for the local
 * demo; a transactional re-check belongs with the service in a later step.
 *
 * @param input - Expected `{ ankietaId: string; answers: number[] }` (10 answers, each 1..5).
 * @returns The stress level, total score, and recommended modules; or a safe error.
 */
export async function submitSurveyAction(
  input: unknown,
): Promise<ActionResult<SubmitSurveyData>> {
  // Manual try/catch (not runAction): the RB-07 gate returns a non-throwing business outcome.
  try {
    await assertSameOrigin();
    const { ankietaId, answers } = SubmitSurveySchema.parse(input);
    const userId = await getCurrentUserId();
    if (!(await isSurveyDue(userId, new Date()))) {
      return fail({
        code: "SURVEY_NOT_DUE",
        message: "Kolejna ankieta będzie dostępna później.",
      });
    }
    const data = await submitSurvey(userId, ankietaId, answers);
    revalidatePath("/dashboard");
    return ok(data);
  } catch (err) {
    return fail(toActionError(err));
  }
}
