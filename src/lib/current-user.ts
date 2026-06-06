import { getDemoEmployeeId } from "@/server/services/session.service";

/**
 * Resolve the acting user's id. Temporary step-3 seam: returns the seeded demo employee.
 *
 * The signature is intentionally frozen to `Promise<string>` (just the id) — actions in step 3
 * need only `userId`. Step 4 swaps the body to a real session lookup (`authService.getSession`)
 * and adds a separate `requireUser(): Promise<{ id, rola }>` accessor for RBAC; the role never
 * gets folded into this function.
 *
 * @returns The acting user's id.
 */
export async function getCurrentUserId(): Promise<string> {
  // TODO Krok 4: replace with authService.getSession(cookie).
  return getDemoEmployeeId();
}
