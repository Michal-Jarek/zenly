import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentUserId } from "@/lib/current-user";
import { AuthRequiredError } from "@/server/domain/errors";
import { getSession } from "@/server/services/auth.service";

// The seam delegates to authService.getSession; mock it so we test only the id-or-throw contract.
vi.mock("@/server/services/auth.service", () => ({ getSession: vi.fn() }));
const mockedGetSession = vi.mocked(getSession);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getCurrentUserId", () => {
  it("returns the session user id", async () => {
    mockedGetSession.mockResolvedValue({ userId: "u1", rola: "EMPLOYEE" });
    await expect(getCurrentUserId()).resolves.toBe("u1");
  });

  it("throws AuthRequiredError when there is no session (mapped to UNAUTHENTICATED)", async () => {
    mockedGetSession.mockResolvedValue(null);
    await expect(getCurrentUserId()).rejects.toBeInstanceOf(AuthRequiredError);
  });
});
