import type { Rola } from "@/server/domain/types";
import { NotFoundError, CredentialsTakenError } from "@/server/domain/errors";
import {
  findUserProfileById,
  findUserExportProfile,
  findUserByEmail,
  updateUserProfile,
} from "@/server/data/user.repository";

/** A user's display profile for the presentation layer. */
export type MyProfile = { imie: string; nazwisko: string; rola: Rola };

/** A user's editable profile (RODO rectification form). */
export type EditableProfile = { imie: string; nazwisko: string; email: string };

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

/**
 * Resolve the current user's editable profile (name + email) for the rectification form.
 *
 * @param userId - The authenticated user.
 * @returns The user's editable fields.
 * @throws {NotFoundError} When the user does not exist.
 */
export async function getMyEditableProfile(userId: string): Promise<EditableProfile> {
  const profile = await findUserExportProfile(userId);
  if (!profile) {
    throw new NotFoundError("User not found.");
  }
  return { imie: profile.imie, nazwisko: profile.nazwisko, email: profile.email };
}

/**
 * Update the current user's profile (RODO rectification: name + email). Email is normalized to
 * lowercase (matching registration) and checked for uniqueness; the `email @unique` constraint
 * (P2002 in the repository) is the real guarantee.
 *
 * @param userId - The authenticated user.
 * @param input - New name and email.
 * @returns The updated display profile.
 * @throws {CredentialsTakenError} When the new email already belongs to another account.
 */
export async function updateMyProfile(
  userId: string,
  input: { imie: string; nazwisko: string; email: string },
): Promise<MyProfile> {
  const email = input.email.toLowerCase();

  // Fast-path pre-check; the @unique constraint (P2002 in updateUserProfile) is the real guarantee.
  const existing = await findUserByEmail(email);
  if (existing && existing.id !== userId) {
    throw new CredentialsTakenError();
  }

  const updated = await updateUserProfile(userId, {
    imie: input.imie,
    nazwisko: input.nazwisko,
    email,
  });
  return { imie: updated.imie, nazwisko: updated.nazwisko, rola: updated.rola };
}
