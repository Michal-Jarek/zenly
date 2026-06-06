import { Prisma } from "@prisma/client";
import type { $Enums } from "@prisma/client";
import { prisma } from "@/server/data/db";
import { CredentialsTakenError } from "@/server/domain/errors";

/** Role type re-exported for the logic layer (services may not import `@prisma/client`). */
export type Rola = $Enums.Rola;

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

/** Display profile of a user (name + role) for the presentation layer. Never returns the hash. */
export function findUserProfileById(id: string): Promise<{
  imie: string;
  nazwisko: string;
  rola: $Enums.Rola;
} | null> {
  return prisma.user.findUnique({
    where: { id },
    select: { imie: true, nazwisko: true, rola: true },
  });
}

/** Resolve a user id by their unique login (registration uniqueness pre-check). */
export function findUserByLogin(
  login: string,
): Promise<{ id: string } | null> {
  return prisma.user.findUnique({
    where: { login },
    select: { id: true },
  });
}

/** Resolve a user id by their unique email (registration uniqueness pre-check). */
export function findUserByEmail(
  email: string,
): Promise<{ id: string } | null> {
  return prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
}

/**
 * Full auth identity for the login flow: password hash + role + lock bookkeeping. Stays inside
 * the logic layer — distinct from {@link findUserByLogin} so the `{ id }` contract never leaks the hash.
 */
export function findUserAuthByLogin(login: string): Promise<{
  id: string;
  hasloHash: string;
  rola: $Enums.Rola;
  failedLoginCount: number;
  lockedUntil: Date | null;
} | null> {
  return prisma.user.findUnique({
    where: { login },
    select: {
      id: true,
      hasloHash: true,
      rola: true,
      failedLoginCount: true,
      lockedUntil: true,
    },
  });
}

/**
 * Create a user with a pre-hashed password. The `login`/`email` `@unique` constraints are the
 * real guarantee: a concurrent duplicate (P2002) is translated to {@link CredentialsTakenError}
 * so the service layer never has to know Prisma error codes (TOCTOU-safe).
 *
 * @throws {CredentialsTakenError} When the login or email is already taken.
 */
export async function createUser(input: {
  imie: string;
  nazwisko: string;
  login: string;
  email: string;
  hasloHash: string;
}): Promise<{ id: string; rola: $Enums.Rola }> {
  try {
    return await prisma.user.create({ data: input, select: { id: true, rola: true } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new CredentialsTakenError();
    }
    throw err;
  }
}

/** Persist failed-login bookkeeping (counter + optional lock) after a login attempt. */
export function updateLoginState(
  id: string,
  state: { failedLoginCount: number; lockedUntil: Date | null },
): Promise<{ id: string }> {
  return prisma.user.update({
    where: { id },
    data: { failedLoginCount: state.failedLoginCount, lockedUntil: state.lockedUntil },
    select: { id: true },
  });
}

/** A user's login by id (used by the GDPR delete path to log the event after the row is gone). */
export function findUserLoginById(id: string): Promise<{ login: string } | null> {
  return prisma.user.findUnique({ where: { id }, select: { login: true } });
}

/** Editable/exportable profile fields (RODO). Explicit safe select — never the password hash. */
export function findUserExportProfile(id: string): Promise<{
  imie: string;
  nazwisko: string;
  login: string;
  email: string;
  rola: $Enums.Rola;
  createdAt: Date;
  updatedAt: Date;
} | null> {
  return prisma.user.findUnique({
    where: { id },
    select: {
      imie: true,
      nazwisko: true,
      login: true,
      email: true,
      rola: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Update a user's editable profile (RODO rectification). The `email @unique` constraint is the real
 * guarantee: a concurrent duplicate (P2002) is translated to {@link CredentialsTakenError} so the
 * service never has to know Prisma error codes.
 *
 * @throws {CredentialsTakenError} When the new email is already taken.
 */
export async function updateUserProfile(
  id: string,
  data: { imie: string; nazwisko: string; email: string },
): Promise<{ imie: string; nazwisko: string; email: string; rola: $Enums.Rola }> {
  try {
    return await prisma.user.update({
      where: { id },
      data,
      select: { imie: true, nazwisko: true, email: true, rola: true },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new CredentialsTakenError();
    }
    throw err;
  }
}

/** Permanently delete a user; schema cascades remove their results/visits/notifications/sessions. */
export function deleteUser(id: string): Promise<{ id: string }> {
  return prisma.user.delete({ where: { id }, select: { id: true } });
}
