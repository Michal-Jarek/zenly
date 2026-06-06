"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { runAction, type ActionResult } from "@/lib/action-result";
import { assertSameOrigin } from "@/lib/csrf";
import { getCurrentUserId } from "@/lib/current-user";
import { markNotificationRead } from "@/server/services/notification.service";

const MarkNotificationReadSchema = z.object({
  id: z.string().min(1),
});

/**
 * Mark one of the current user's notifications as read. Thin transport: same-origin guard, shape
 * validation, then delegate to the owner-scoped service.
 *
 * @param input - Expected `{ id: string }`.
 * @returns An empty success, or a safe error (e.g. `NOT_FOUND`).
 */
export async function markNotificationReadAction(
  input: unknown,
): Promise<ActionResult<void>> {
  return runAction(async () => {
    await assertSameOrigin();
    const { id } = MarkNotificationReadSchema.parse(input);
    const userId = await getCurrentUserId();
    await markNotificationRead(userId, id);
    revalidatePath("/dashboard"); // TODO Krok 5: confirm notifications route.
  });
}
