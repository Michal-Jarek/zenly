"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { runAction, type ActionResult } from "@/lib/action-result";
import { assertSameOrigin } from "@/lib/csrf";
import { getCurrentUserId } from "@/lib/current-user";
import { exportMyData, deleteMyAccount, type ExportDTO } from "@/server/services/gdpr.service";
import { updateMyProfile, type MyProfile } from "@/server/services/user.service";
import { logout } from "@/server/services/auth.service";
import { updateProfileFormSchema } from "@/lib/validation/profile";

/**
 * Export the current user's personal data (RODO right of access). Thin transport: same-origin guard,
 * resolve the acting user, delegate to the service. The browser builds the download from this DTO.
 *
 * @returns The user's personal data, or a safe error (e.g. `UNAUTHENTICATED`).
 */
export async function exportMyDataAction(): Promise<ActionResult<ExportDTO>> {
  return runAction(async () => {
    await assertSameOrigin();
    const userId = await getCurrentUserId();
    return exportMyData(userId);
  });
}

/**
 * Update the current user's profile (RODO rectification). Thin transport: same-origin guard, shape
 * validation, delegate to the service; a duplicate email maps to `CONFLICT`.
 *
 * @param input - Expected `{ imie, nazwisko, email }`.
 * @returns The updated display profile, or a safe error.
 */
export async function updateMyProfileAction(input: unknown): Promise<ActionResult<MyProfile>> {
  return runAction(async () => {
    await assertSameOrigin();
    const data = updateProfileFormSchema.parse(input);
    const userId = await getCurrentUserId();
    const profile = await updateMyProfile(userId, data);
    revalidatePath("/ustawienia");
    return profile;
  });
}

/**
 * Delete the current user's account (RODO erasure): remove the account (schema cascades wipe the
 * personal data), then end the session and redirect to login. The redirect propagates via
 * `unstable_rethrow` in {@link runAction}.
 *
 * @returns A safe error on failure; on success it redirects (never resolves with data).
 */
export async function deleteMyAccountAction(): Promise<ActionResult<void>> {
  return runAction(async () => {
    await assertSameOrigin();
    const userId = await getCurrentUserId();
    await deleteMyAccount(userId);
    await logout();
    redirect("/login");
  });
}
