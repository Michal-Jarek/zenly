import type { Rola } from "@/server/domain/types";
import { NotFoundError } from "@/server/domain/errors";
import { findUserProfileById } from "@/server/data/user.repository";

/** A user's display profile for the presentation layer. */
export type MyProfile = { imie: string; nazwisko: string; rola: Rola };

/**
 * Resolve the current user's display profile (name + role).
 *
 * @param userId - The authenticated user.
 * @returns The user's profile.
 * @throws {NotFoundError} When the user does not exist.
 */
export async function getMyProfile(userId: string): Promise<MyProfile> {
  const profile = await findUserProfileById(userId);
  if (!profile) {
    throw new NotFoundError("User not found.");
  }
  return { imie: profile.imie, nazwisko: profile.nazwisko, rola: profile.rola };
}
