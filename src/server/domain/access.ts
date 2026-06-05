import type { Rola } from "@/server/domain/types";
import { AccessDeniedError } from "@/server/domain/errors";

/**
 * Assert that a user owns an individual survey result (RB-29).
 *
 * Access is strictly owner-only: a single result is visible only to the employee who
 * produced it. Role is intentionally ignored — HR and ADMIN are also denied here, because
 * HR consumes only the anonymized aggregate (`anonymizeStressReport`), never an individual
 * result. This is by design, not an oversight.
 *
 * @param user - The requesting user.
 * @param wynik - The survey result being accessed.
 * @throws {AccessDeniedError} When `user.id` does not match `wynik.userId`.
 */
export function assertOwnsResult(
  user: { id: string; rola: Rola },
  wynik: { userId: string },
): void {
  if (user.id !== wynik.userId) {
    throw new AccessDeniedError("You do not own this survey result.");
  }
}
