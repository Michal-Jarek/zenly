const MAX_FAILED_ATTEMPTS = 5;

/**
 * Decide whether an account should be locked after repeated failed logins.
 * Locks at 5 or more consecutive failures.
 *
 * @param failed - Number of consecutive failed login attempts.
 * @returns `true` when the account should be locked.
 */
export function shouldLockAccount(failed: number): boolean {
  return failed >= MAX_FAILED_ATTEMPTS;
}
