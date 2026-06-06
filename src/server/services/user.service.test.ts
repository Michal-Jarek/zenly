import { describe, it, expect, vi, beforeEach } from "vitest";
import { getMyEditableProfile, updateMyProfile } from "@/server/services/user.service";
import { NotFoundError, CredentialsTakenError } from "@/server/domain/errors";
import {
  findUserExportProfile,
  findUserByEmail,
  updateUserProfile,
} from "@/server/data/user.repository";

vi.mock("@/server/data/user.repository", () => ({
  findUserProfileById: vi.fn(),
  findUserExportProfile: vi.fn(),
  findUserByEmail: vi.fn(),
  updateUserProfile: vi.fn(),
}));

const mExport = vi.mocked(findUserExportProfile);
const mByEmail = vi.mocked(findUserByEmail);
const mUpdate = vi.mocked(updateUserProfile);

const EXPORT_PROFILE = {
  imie: "Jan",
  nazwisko: "Kowalski",
  login: "jan",
  email: "jan@x.com",
  rola: "EMPLOYEE" as const,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-02-01"),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getMyEditableProfile", () => {
  it("returns name + email", async () => {
    mExport.mockResolvedValue(EXPORT_PROFILE);
    await expect(getMyEditableProfile("u1")).resolves.toEqual({
      imie: "Jan",
      nazwisko: "Kowalski",
      email: "jan@x.com",
    });
  });

  it("throws NotFoundError for an unknown user", async () => {
    mExport.mockResolvedValue(null);
    await expect(getMyEditableProfile("ghost")).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("updateMyProfile", () => {
  it("lowercases the email and persists, returning the display profile", async () => {
    mByEmail.mockResolvedValue(null);
    mUpdate.mockResolvedValue({ imie: "Jan", nazwisko: "Nowak", email: "jan@x.com", rola: "EMPLOYEE" });

    const res = await updateMyProfile("u1", { imie: "Jan", nazwisko: "Nowak", email: "Jan@X.com" });

    expect(mUpdate).toHaveBeenCalledWith("u1", {
      imie: "Jan",
      nazwisko: "Nowak",
      email: "jan@x.com",
    });
    expect(res).toEqual({ imie: "Jan", nazwisko: "Nowak", rola: "EMPLOYEE" });
  });

  it("rejects an email already taken by another user (no write)", async () => {
    mByEmail.mockResolvedValue({ id: "other" });
    await expect(
      updateMyProfile("u1", { imie: "Jan", nazwisko: "Nowak", email: "taken@x.com" }),
    ).rejects.toBeInstanceOf(CredentialsTakenError);
    expect(mUpdate).not.toHaveBeenCalled();
  });

  it("allows keeping the user's own email (same id)", async () => {
    mByEmail.mockResolvedValue({ id: "u1" });
    mUpdate.mockResolvedValue({ imie: "Jan", nazwisko: "Kowalski", email: "jan@x.com", rola: "EMPLOYEE" });
    await expect(
      updateMyProfile("u1", { imie: "Jan", nazwisko: "Kowalski", email: "jan@x.com" }),
    ).resolves.toEqual({ imie: "Jan", nazwisko: "Kowalski", rola: "EMPLOYEE" });
    expect(mUpdate).toHaveBeenCalledOnce();
  });
});
