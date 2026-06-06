"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { runAction, type ActionResult } from "@/lib/action-result";
import { assertSameOrigin } from "@/lib/csrf";
import { getCurrentUserId } from "@/lib/current-user";
import { bookConsultation } from "@/server/services/consultation.service";

const BookConsultationSchema = z.object({
  terminId: z.string().min(1),
});

/**
 * Book a consultation slot for the current user. Thin transport: same-origin guard, shape
 * validation, then delegate the atomic booking to the service. Returns a slim DTO (just the
 * visit id) to keep internal/Prisma fields out of the transport contract.
 *
 * @param input - Expected `{ terminId: string }`.
 * @returns `{ id }` of the created visit; or a safe error (e.g. `SLOT_TAKEN`, `NOT_FOUND`).
 */
export async function bookConsultationAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    await assertSameOrigin();
    const { terminId } = BookConsultationSchema.parse(input);
    const userId = await getCurrentUserId();
    const wizyta = await bookConsultation(userId, terminId);
    revalidatePath("/konsultacja");
    return { id: wizyta.id };
  });
}
