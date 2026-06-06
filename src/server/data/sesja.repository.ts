import { prisma } from "@/server/data/db";
import type { $Enums } from "@prisma/client";

// Data-access for SesjaUzytkownika. The `token` column holds the SHA-256 hash (never the raw token).

/** Open a new session row. Returns the new id. */
export function createSession(input: {
  userId: string;
  tokenHash: string;
  wygasa: Date;
}): Promise<{ id: string }> {
  return prisma.sesjaUzytkownika.create({
    data: { userId: input.userId, token: input.tokenHash, wygasa: input.wygasa },
    select: { id: true },
  });
}

/**
 * Look up a session by its hashed token, including the owner's id and role so the service can
 * validate the session without a second query. Returns `null` when not found. (Account-lock state
 * is intentionally not selected: locking is enforced on the login path, not on live sessions.)
 */
export function findSessionByTokenHash(tokenHash: string): Promise<{
  id: string;
  koniec: Date | null;
  wygasa: Date;
  user: { id: string; rola: $Enums.Rola };
} | null> {
  return prisma.sesjaUzytkownika.findUnique({
    where: { token: tokenHash },
    select: {
      id: true,
      koniec: true,
      wygasa: true,
      user: { select: { id: true, rola: true } },
    },
  });
}

/** Close an open session (logout). Sets `koniec=now`; returns the affected count. */
export function closeSession(tokenHash: string): Promise<{ count: number }> {
  return prisma.sesjaUzytkownika.updateMany({
    where: { token: tokenHash, koniec: null },
    data: { koniec: new Date() },
  });
}
