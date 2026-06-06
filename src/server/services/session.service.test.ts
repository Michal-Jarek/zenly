import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDemoEmployeeId } from "@/server/services/session.service";
import { findUserByLogin } from "@/server/data/user.repository";
import { NotFoundError } from "@/server/domain/errors";

vi.mock("@/server/data/user.repository", () => ({
  findUserByLogin: vi.fn(),
}));

const mockedFindByLogin = vi.mocked(findUserByLogin);

describe("getDemoEmployeeId (temporary current-user seam)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves the seeded demo employee id by login (runtime lookup, not a hardcoded id)", async () => {
    mockedFindByLogin.mockResolvedValue({ id: "u1" });
    await expect(getDemoEmployeeId()).resolves.toBe("u1");
    expect(mockedFindByLogin).toHaveBeenCalledWith("pracownik1");
  });

  it("throws NotFoundError when the demo employee is not seeded", async () => {
    mockedFindByLogin.mockResolvedValue(null);
    await expect(getDemoEmployeeId()).rejects.toBeInstanceOf(NotFoundError);
  });
});
