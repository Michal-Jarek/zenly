import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { validatePasswordStrength } from "@/server/domain/password";
import { shouldLockAccount } from "@/server/domain/account-lock";
import {
  ValidationError,
  CredentialsTakenError,
  InvalidCredentialsError,
  AccountLockedError,
  AccessDeniedError,
} from "@/server/domain/errors";
import {
  findUserByLogin,
  findUserByEmail,
  findUserAuthByLogin,
  createUser,
  updateLoginState,
  type Rola,
} from "@/server/data/user.repository";
import {
  createSession,
  findSessionByTokenHash,
  closeSession,
} from "@/server/data/sesja.repository";
import { createSecurityEvent } from "@/server/data/securityEvent.repository";
import {
  readSessionToken,
  writeSessionToken,
  clearSessionToken,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/session-cookie";

/** A validated session: the acting user's id and role. */
export type AuthSession = { userId: string; rola: Rola };

const BCRYPT_COST = 12;
const LOCK_WINDOW_MS = 15 * 60 * 1000; // 15 min
// A real bcrypt hash (same cost as registration) compared against on unknown-login attempts, so the
// failed-login path takes the same time whether or not the account exists (anti-enumeration).
const DUMMY_HASH = "$2b$12$E9Na8lz42B2nhmNU.TNZW.5dfZVr2Pw03ac19CXeamqBQC/NrFuVy";

/** Hash a raw session token for storage/lookup. Deterministic; SHA-256 hex. */
export function sha256Hex(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Register a new account: enforce password strength, check login/email uniqueness, hash the
 * password (bcrypt) and persist. Logs a `REJESTRACJA` security event. Never auto-logs-in.
 *
 * @param input - New-account fields; `haslo` is the plaintext password (hashed here, never stored).
 * @returns The new user's id.
 * @throws {ValidationError} When the password is too weak.
 * @throws {CredentialsTakenError} When the login or email is already taken (pre-check or DB P2002).
 */
export async function register(input: {
  imie: string;
  nazwisko: string;
  login: string;
  email: string;
  haslo: string;
}): Promise<{ id: string }> {
  const strength = validatePasswordStrength(input.haslo);
  if (!strength.valid) {
    throw new ValidationError(strength.errors, "Weak password");
  }

  // Email is case-insensitive by convention; normalize so "Jan@x.com" and "jan@x.com" can't both
  // register (Postgres @unique is case-sensitive). Login keeps its case — it is the display "Nazwa".
  const email = input.email.toLowerCase();

  // Fast-path pre-check; the @unique constraint (P2002 in createUser) is the real guarantee.
  const [byLogin, byEmail] = await Promise.all([
    findUserByLogin(input.login),
    findUserByEmail(email),
  ]);
  if (byLogin || byEmail) {
    throw new CredentialsTakenError();
  }

  const hasloHash = await bcrypt.hash(input.haslo, BCRYPT_COST);
  const user = await createUser({
    imie: input.imie,
    nazwisko: input.nazwisko,
    login: input.login,
    email,
    hasloHash,
  });

  await createSecurityEvent({
    typ: "REJESTRACJA",
    opis: "Rejestracja konta.",
    userId: user.id,
    login: input.login,
  });
  return { id: user.id };
}

/**
 * Authenticate a login/password pair. On success: reset the failed-login counter, open a session
 * (raw token in the cookie, SHA-256 hash in the DB) and log `LOGOWANIE_OK`. On failure: increment
 * the counter, lock the account after 5 consecutive failures, log `LOGOWANIE_BLAD`/`KONTO_ZABLOKOWANE`.
 *
 * @param login - The attempted login.
 * @param haslo - The attempted plaintext password.
 * @param ip - Optional client ip recorded on the security event.
 * @returns The authenticated session.
 * @throws {InvalidCredentialsError} For an unknown login or a wrong password (generic).
 * @throws {AccountLockedError} When the account is currently locked.
 */
export async function login(login: string, haslo: string, ip?: string): Promise<AuthSession> {
  const user = await findUserAuthByLogin(login);

  // Unknown login: still run a bcrypt compare against a dummy hash to equalize timing.
  if (!user) {
    await bcrypt.compare(haslo, DUMMY_HASH);
    await createSecurityEvent({
      typ: "LOGOWANIE_BLAD",
      opis: "Logowanie: nieznany login.",
      login,
      ip,
    });
    throw new InvalidCredentialsError();
  }

  const now = new Date();
  if (user.lockedUntil && user.lockedUntil > now) {
    // Log continued attempts during the lock window for forensics (the lock event itself is
    // already recorded at KONTO_ZABLOKOWANE; this captures the ongoing hammering).
    await createSecurityEvent({
      typ: "LOGOWANIE_BLAD",
      opis: "Logowanie: próba na zablokowane konto.",
      userId: user.id,
      login,
      ip,
    });
    throw new AccountLockedError();
  }

  const passwordOk = await bcrypt.compare(haslo, user.hasloHash);
  if (!passwordOk) {
    const failedLoginCount = user.failedLoginCount + 1;
    const lock = shouldLockAccount(failedLoginCount);
    // On lock, start the window and reset the counter so a fresh batch of attempts follows expiry.
    const lockedUntil = lock ? new Date(now.getTime() + LOCK_WINDOW_MS) : null;
    await updateLoginState(user.id, { failedLoginCount: lock ? 0 : failedLoginCount, lockedUntil });
    if (lock) {
      await createSecurityEvent({
        typ: "KONTO_ZABLOKOWANE",
        opis: `Konto zablokowane po ${failedLoginCount} nieudanych próbach.`,
        userId: user.id,
        login,
        ip,
      });
    }
    await createSecurityEvent({
      typ: "LOGOWANIE_BLAD",
      opis: "Logowanie: błędne hasło.",
      userId: user.id,
      login,
      ip,
    });
    throw new InvalidCredentialsError();
  }

  // Success: clear lock bookkeeping and open a fresh session.
  await updateLoginState(user.id, { failedLoginCount: 0, lockedUntil: null });
  const rawToken = randomBytes(32).toString("hex");
  const wygasa = new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000);
  await createSession({ userId: user.id, tokenHash: sha256Hex(rawToken), wygasa });
  await writeSessionToken(rawToken);
  await createSecurityEvent({
    typ: "LOGOWANIE_OK",
    opis: "Poprawne logowanie.",
    userId: user.id,
    login,
    ip,
  });
  return { userId: user.id, rola: user.rola };
}

/**
 * Log out: close the session row (if any) and clear the cookie. Idempotent — safe with no session.
 *
 * @param rawToken - Optional raw token; defaults to the current request cookie.
 */
export async function logout(rawToken?: string): Promise<void> {
  const token = rawToken ?? (await readSessionToken());
  if (token) {
    await closeSession(sha256Hex(token));
  }
  await clearSessionToken();
}

/**
 * Resolve the current session, or `null`. A session is valid only when it exists, is not closed
 * (`koniec` is null) and has not expired (`wygasa` in the future).
 *
 * @param rawToken - Optional raw token; defaults to the current request cookie.
 * @returns The validated session, or `null` when none/invalid.
 */
export async function getSession(rawToken?: string): Promise<AuthSession | null> {
  const token = rawToken ?? (await readSessionToken());
  if (!token) return null;

  const session = await findSessionByTokenHash(sha256Hex(token));
  if (!session) return null;

  // Validity is session-scoped only (open + not expired). Account lock is enforced on the LOGIN
  // path, not here: a live session must survive a lockout triggered by an attacker's failed logins
  // (they hold no password), otherwise the lock becomes a session-killing DoS amplifier.
  const now = new Date();
  const valid = session.koniec === null && session.wygasa > now;
  if (!valid) return null;

  return { userId: session.user.id, rola: session.user.rola };
}

/**
 * Require a logged-in user (RBAC entry point). Redirects to `/login` when unauthenticated; when
 * `roles` is given, denies access if the user's role is not in the list.
 *
 * @param roles - Optional allow-list of roles permitted to proceed.
 * @returns The authenticated session.
 * @throws {AccessDeniedError} When the user's role is not allowed.
 */
export async function requireUser(roles?: Rola[]): Promise<AuthSession> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (roles && !roles.includes(session.rola)) {
    throw new AccessDeniedError();
  }
  return session;
}
