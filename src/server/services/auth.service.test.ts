import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import {
  register,
  login,
  logout,
  getSession,
  requireUser,
  sha256Hex,
} from "@/server/services/auth.service";
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
} from "@/lib/session-cookie";

// Mock the data + I/O layers so the service tests never touch Prisma, the cookie store, or real bcrypt cost.
vi.mock("@/server/data/user.repository", () => ({
  findUserByLogin: vi.fn(),
  findUserByEmail: vi.fn(),
  findUserAuthByLogin: vi.fn(),
  createUser: vi.fn(),
  updateLoginState: vi.fn(),
}));
vi.mock("@/server/data/sesja.repository", () => ({
  createSession: vi.fn(),
  findSessionByTokenHash: vi.fn(),
  closeSession: vi.fn(),
}));
vi.mock("@/server/data/securityEvent.repository", () => ({
  createSecurityEvent: vi.fn(),
}));
vi.mock("@/lib/session-cookie", () => ({
  readSessionToken: vi.fn(),
  writeSessionToken: vi.fn(),
  clearSessionToken: vi.fn(),
  SESSION_MAX_AGE_SECONDS: 604800,
}));
vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn(), compare: vi.fn() },
}));

const mockedFindByLogin = vi.mocked(findUserByLogin);
const mockedFindByEmail = vi.mocked(findUserByEmail);
const mockedFindAuth = vi.mocked(findUserAuthByLogin);
const mockedCreateUser = vi.mocked(createUser);
const mockedUpdateLogin = vi.mocked(updateLoginState);
const mockedCreateSession = vi.mocked(createSession);
const mockedFindSession = vi.mocked(findSessionByTokenHash);
const mockedCloseSession = vi.mocked(closeSession);
const mockedSecurityEvent = vi.mocked(createSecurityEvent);
const mockedReadToken = vi.mocked(readSessionToken);
const mockedWriteToken = vi.mocked(writeSessionToken);
const mockedClearToken = vi.mocked(clearSessionToken);
const mockedHash = vi.mocked(bcrypt.hash);
const mockedCompare = vi.mocked(bcrypt.compare);

const STRONG_PASSWORD = "StrongPass1!"; // 12 chars, upper+lower+digit+special
const HOUR = 60 * 60 * 1000;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("sha256Hex", () => {
  it("is deterministic SHA-256 hex", () => {
    expect(sha256Hex("abc")).toBe(sha256Hex("abc"));
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});

describe("register", () => {
  it("hashes the password and persists, then logs REJESTRACJA", async () => {
    mockedFindByLogin.mockResolvedValue(null);
    mockedFindByEmail.mockResolvedValue(null);
    mockedHash.mockResolvedValue("HASHED" as never);
    mockedCreateUser.mockResolvedValue({ id: "u1", rola: "EMPLOYEE" });

    const result = await register({
      imie: "Jan",
      nazwisko: "Kowalski",
      login: "jan",
      email: "jan@example.com",
      haslo: STRONG_PASSWORD,
    });

    expect(result).toEqual({ id: "u1" });
    expect(mockedHash).toHaveBeenCalledWith(STRONG_PASSWORD, 12);
    expect(mockedCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({ login: "jan", hasloHash: "HASHED" }),
    );
    expect(mockedSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ typ: "REJESTRACJA", userId: "u1" }),
    );
  });

  it("rejects a weak password without hashing or persisting", async () => {
    await expect(
      register({ imie: "J", nazwisko: "K", login: "jan", email: "jan@example.com", haslo: "short" }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(mockedHash).not.toHaveBeenCalled();
    expect(mockedCreateUser).not.toHaveBeenCalled();
  });

  it("propagates a unique-constraint conflict (P2002 → CredentialsTakenError)", async () => {
    mockedFindByLogin.mockResolvedValue(null);
    mockedFindByEmail.mockResolvedValue(null);
    mockedHash.mockResolvedValue("HASHED" as never);
    mockedCreateUser.mockRejectedValue(new CredentialsTakenError());

    await expect(
      register({ imie: "J", nazwisko: "K", login: "jan", email: "jan@example.com", haslo: STRONG_PASSWORD }),
    ).rejects.toBeInstanceOf(CredentialsTakenError);
  });
});

describe("login", () => {
  it("equalizes timing for an unknown login: dummy compare + generic error", async () => {
    mockedFindAuth.mockResolvedValue(null);
    mockedCompare.mockResolvedValue(false as never);

    await expect(login("ghost", "whatever")).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(mockedCompare).toHaveBeenCalledOnce();
    // The dummy compared against must be a real bcrypt hash, else the timing equalization is a no-op.
    expect(mockedCompare.mock.calls[0][1]).toMatch(/^\$2[aby]\$\d{2}\$/);
    expect(mockedSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ typ: "LOGOWANIE_BLAD", login: "ghost" }),
    );
    expect(mockedUpdateLogin).not.toHaveBeenCalled();
    expect(mockedCreateSession).not.toHaveBeenCalled();
  });

  it("rejects a locked account without comparing the password", async () => {
    mockedFindAuth.mockResolvedValue({
      id: "u1",
      hasloHash: "H",
      rola: "EMPLOYEE",
      failedLoginCount: 5,
      lockedUntil: new Date(Date.now() + HOUR),
    });

    await expect(login("jan", "whatever")).rejects.toBeInstanceOf(AccountLockedError);
    expect(mockedCompare).not.toHaveBeenCalled();
  });

  it("increments the failed counter on a wrong password", async () => {
    mockedFindAuth.mockResolvedValue({
      id: "u1",
      hasloHash: "H",
      rola: "EMPLOYEE",
      failedLoginCount: 0,
      lockedUntil: null,
    });
    mockedCompare.mockResolvedValue(false as never);

    await expect(login("jan", "wrong")).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(mockedUpdateLogin).toHaveBeenCalledWith("u1", { failedLoginCount: 1, lockedUntil: null });
    expect(mockedSecurityEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ typ: "KONTO_ZABLOKOWANE" }),
    );
  });

  it("locks the account on the 5th consecutive failure", async () => {
    mockedFindAuth.mockResolvedValue({
      id: "u1",
      hasloHash: "H",
      rola: "EMPLOYEE",
      failedLoginCount: 4,
      lockedUntil: null,
    });
    mockedCompare.mockResolvedValue(false as never);

    await expect(login("jan", "wrong")).rejects.toBeInstanceOf(InvalidCredentialsError);
    const [, state] = mockedUpdateLogin.mock.calls[0];
    expect(state.failedLoginCount).toBe(0);
    expect(state.lockedUntil).toBeInstanceOf(Date);
    expect(state.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
    expect(mockedSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ typ: "KONTO_ZABLOKOWANE", userId: "u1" }),
    );
  });

  it("on success resets counters, opens a hashed session and sets the cookie", async () => {
    mockedFindAuth.mockResolvedValue({
      id: "u1",
      hasloHash: "H",
      rola: "EMPLOYEE",
      failedLoginCount: 2,
      lockedUntil: null,
    });
    mockedCompare.mockResolvedValue(true as never);
    mockedCreateSession.mockResolvedValue({ id: "s1" });

    const session = await login("jan", STRONG_PASSWORD);

    expect(session).toEqual({ userId: "u1", rola: "EMPLOYEE" });
    expect(mockedUpdateLogin).toHaveBeenCalledWith("u1", { failedLoginCount: 0, lockedUntil: null });

    // Cookie carries the RAW token; the DB stores its SHA-256 hash.
    const rawToken = mockedWriteToken.mock.calls[0][0];
    const stored = mockedCreateSession.mock.calls[0][0];
    expect(stored.tokenHash).toBe(sha256Hex(rawToken));
    expect(stored.tokenHash).not.toBe(rawToken);
    expect(mockedSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ typ: "LOGOWANIE_OK", userId: "u1" }),
    );
  });

  it("lets the user in once the lock window has expired (lockedUntil in the past)", async () => {
    mockedFindAuth.mockResolvedValue({
      id: "u1",
      hasloHash: "H",
      rola: "EMPLOYEE",
      failedLoginCount: 5,
      lockedUntil: new Date(Date.now() - HOUR), // expired lock must not block
    });
    mockedCompare.mockResolvedValue(true as never);
    mockedCreateSession.mockResolvedValue({ id: "s1" });

    await expect(login("jan", STRONG_PASSWORD)).resolves.toEqual({ userId: "u1", rola: "EMPLOYEE" });
    expect(mockedCompare).toHaveBeenCalledOnce();
  });
});

describe("getSession", () => {
  const validUser = { id: "u1", rola: "EMPLOYEE" as const };

  it("accepts a live session and returns the user + role", async () => {
    mockedFindSession.mockResolvedValue({
      id: "s1",
      koniec: null,
      wygasa: new Date(Date.now() + HOUR),
      user: validUser,
    });
    await expect(getSession("raw")).resolves.toEqual({ userId: "u1", rola: "EMPLOYEE" });
    expect(mockedFindSession).toHaveBeenCalledWith(sha256Hex("raw"));
  });

  it("resolves the cookie when called with no argument", async () => {
    mockedReadToken.mockResolvedValue("raw");
    mockedFindSession.mockResolvedValue({
      id: "s1",
      koniec: null,
      wygasa: new Date(Date.now() + HOUR),
      user: validUser,
    });
    await expect(getSession()).resolves.toEqual({ userId: "u1", rola: "EMPLOYEE" });
    expect(mockedFindSession).toHaveBeenCalledWith(sha256Hex("raw"));
  });

  it("rejects an expired session", async () => {
    mockedFindSession.mockResolvedValue({
      id: "s1",
      koniec: null,
      wygasa: new Date(Date.now() - HOUR),
      user: validUser,
    });
    await expect(getSession("raw")).resolves.toBeNull();
  });

  it("rejects a closed session", async () => {
    mockedFindSession.mockResolvedValue({
      id: "s1",
      koniec: new Date(Date.now() - HOUR),
      wygasa: new Date(Date.now() + HOUR),
      user: validUser,
    });
    await expect(getSession("raw")).resolves.toBeNull();
  });

  it("returns null when there is no cookie", async () => {
    mockedReadToken.mockResolvedValue(undefined);
    await expect(getSession()).resolves.toBeNull();
    expect(mockedFindSession).not.toHaveBeenCalled();
  });
});

describe("requireUser (RBAC gate)", () => {
  const liveSession = {
    id: "s1",
    koniec: null,
    wygasa: new Date(Date.now() + HOUR),
    user: { id: "u1", rola: "EMPLOYEE" as const },
  };

  it("returns the session when no roles are required", async () => {
    mockedReadToken.mockResolvedValue("raw");
    mockedFindSession.mockResolvedValue(liveSession);
    await expect(requireUser()).resolves.toEqual({ userId: "u1", rola: "EMPLOYEE" });
  });

  it("returns the session when the role is in the allow-list", async () => {
    mockedReadToken.mockResolvedValue("raw");
    mockedFindSession.mockResolvedValue(liveSession);
    await expect(requireUser(["EMPLOYEE", "ADMIN"])).resolves.toEqual({
      userId: "u1",
      rola: "EMPLOYEE",
    });
  });

  it("denies access when the role is not allowed", async () => {
    mockedReadToken.mockResolvedValue("raw");
    mockedFindSession.mockResolvedValue(liveSession);
    await expect(requireUser(["ADMIN"])).rejects.toBeInstanceOf(AccessDeniedError);
  });

  it("redirects to /login when there is no session", async () => {
    mockedReadToken.mockResolvedValue(undefined);
    await expect(requireUser()).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });
  });
});

describe("logout", () => {
  it("closes the hashed session and clears the cookie", async () => {
    mockedCloseSession.mockResolvedValue({ count: 1 });
    await logout("raw");
    expect(mockedCloseSession).toHaveBeenCalledWith(sha256Hex("raw"));
    expect(mockedClearToken).toHaveBeenCalledOnce();
  });

  it("is idempotent with no token: clears the cookie, no DB close", async () => {
    mockedReadToken.mockResolvedValue(undefined);
    await logout();
    expect(mockedCloseSession).not.toHaveBeenCalled();
    expect(mockedClearToken).toHaveBeenCalledOnce();
  });
});
