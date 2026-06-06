import { createSecurityEvent } from "@/server/data/securityEvent.repository";
import { getClientIp } from "@/lib/request-ip";

// Central security-audit logger for the events owned by step 6 (access denials + GDPR). Thin wrapper
// over the SecurityEvent repository that resolves the client IP best-effort.
//
// Invariant: this module takes the acting identity as parameters and NEVER imports `auth.service`
// or `current-user` (that would create an import cycle). It records only safe metadata — never
// passwords and never full survey answers.

/**
 * Record a denied access attempt as `DOSTEP_ODMOWA` (RBAC enforcement).
 *
 * @param input - `opis` (what was refused) plus the acting identity when known.
 */
export async function logAccessDenied(input: {
  userId?: string | null;
  login?: string | null;
  opis: string;
}): Promise<void> {
  const ip = await getClientIp();
  await createSecurityEvent({
    typ: "DOSTEP_ODMOWA",
    opis: input.opis,
    userId: input.userId ?? null,
    login: input.login ?? null,
    ip,
  });
}

/**
 * Record a successful personal-data export as `RODO_EKSPORT`.
 *
 * @param input - The acting user's id and (optionally) login.
 */
export async function logDataExport(input: {
  userId: string;
  login?: string | null;
}): Promise<void> {
  const ip = await getClientIp();
  await createSecurityEvent({
    typ: "RODO_EKSPORT",
    opis: "Eksport danych osobowych (RODO).",
    userId: input.userId,
    login: input.login ?? null,
    ip,
  });
}

/**
 * Record an account deletion as `RODO_USUNIECIE`. The user row is already gone, so the event is
 * logged by `login` only (its `userId` would be set to null by the schema anyway — the audit survives).
 *
 * @param input - The deleted account's login.
 */
export async function logAccountDeletion(input: { login: string }): Promise<void> {
  const ip = await getClientIp();
  await createSecurityEvent({
    typ: "RODO_USUNIECIE",
    opis: "Usunięcie konta na żądanie użytkownika (RODO).",
    login: input.login,
    ip,
  });
}
