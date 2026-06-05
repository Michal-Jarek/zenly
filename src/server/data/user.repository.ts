import { prisma } from "@/server/data/db";

/** Data-access for the User table. */
export function countUsers(): Promise<number> {
  return prisma.user.count();
}
