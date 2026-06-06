import { getSession } from "@/server/services/auth.service";
import { AuthRequiredError } from "@/server/domain/errors";

/**
 * Resolve the acting user's id from the current session (real auth, step 4 — replaces the step-3
 * demo seam). The signature stays frozen at `Promise<string>` (just the id) so step-3 actions keep
 * working unchanged; RBAC consumers needing the role call `authService.requireUser` instead.
 *
 * @returns The acting user's id.
 * @throws {AuthRequiredError} When there is no valid session (mapped to `UNAUTHENTICATED`).
 */
export async function getCurrentUserId(): Promise<string> {
  const session = await getSession();
  if (!session) {
    throw new AuthRequiredError();
  }
  return session.userId;
}
