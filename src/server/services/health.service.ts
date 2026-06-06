import { countUsers } from "@/server/data/user.repository";

/**
 * Business-logic layer entry used by the presentation layer to prove the full
 * three-layer path (page -> service -> repository -> Prisma) and that the seed ran.
 *
 * @returns The current number of users in the database.
 */
export async function getStatus(): Promise<{ users: number }> {
  return { users: await countUsers() };
}
