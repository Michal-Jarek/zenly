import { prisma } from "@/server/data/db";
import type { $Enums } from "@prisma/client";

/**
 * Record a security event (auth audit trail). The caller must never pass passwords or full
 * survey answers in `opis` — only safe metadata (event type, attempted login, ip).
 */
export function createSecurityEvent(input: {
  typ: $Enums.TypZdarzenia;
  opis: string;
  userId?: string | null;
  login?: string | null;
  ip?: string | null;
}): Promise<{ id: string }> {
  return prisma.securityEvent.create({
    data: {
      typ: input.typ,
      opis: input.opis,
      userId: input.userId ?? null,
      login: input.login ?? null,
      ip: input.ip ?? null,
    },
    select: { id: true },
  });
}
