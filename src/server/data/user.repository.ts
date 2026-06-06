import { prisma } from "@/server/data/db";
import type { $Enums } from "@prisma/client";

/** Data-access for the User table. */
export function countUsers(): Promise<number> {
  return prisma.user.count();
}

/** Minimal user identity for ownership checks — never returns the password hash. */
export function findUserById(
  id: string,
): Promise<{ id: string; rola: $Enums.Rola } | null> {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, rola: true },
  });
}

/** Resolve a user id by their unique login (used by the temporary current-user seam). */
export function findUserByLogin(
  login: string,
): Promise<{ id: string } | null> {
  return prisma.user.findUnique({
    where: { login },
    select: { id: true },
  });
}
