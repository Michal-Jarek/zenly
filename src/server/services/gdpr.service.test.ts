import { describe, it, expect, vi, beforeEach } from "vitest";
import { exportMyData, deleteMyAccount } from "@/server/services/gdpr.service";
import { NotFoundError } from "@/server/domain/errors";
import {
  findUserExportProfile,
  findUserLoginById,
  deleteUser,
} from "@/server/data/user.repository";
import { getResultsForExport } from "@/server/data/wynik.repository";
import { getVisitsForExport } from "@/server/data/wizyta.repository";
import { listByUser } from "@/server/data/powiadomienie.repository";
import { logDataExport, logAccountDeletion } from "@/server/services/security.service";

vi.mock("@/server/data/user.repository", () => ({
  findUserExportProfile: vi.fn(),
  findUserLoginById: vi.fn(),
  deleteUser: vi.fn(),
}));
vi.mock("@/server/data/wynik.repository", () => ({ getResultsForExport: vi.fn() }));
vi.mock("@/server/data/wizyta.repository", () => ({ getVisitsForExport: vi.fn() }));
vi.mock("@/server/data/powiadomienie.repository", () => ({ listByUser: vi.fn() }));
vi.mock("@/server/services/security.service", () => ({
  logDataExport: vi.fn(),
  logAccountDeletion: vi.fn(),
}));

const mProfile = vi.mocked(findUserExportProfile);
const mLogin = vi.mocked(findUserLoginById);
const mDelete = vi.mocked(deleteUser);
const mResults = vi.mocked(getResultsForExport);
const mVisits = vi.mocked(getVisitsForExport);
const mNotifs = vi.mocked(listByUser);
const mLogExport = vi.mocked(logDataExport);
const mLogDelete = vi.mocked(logAccountDeletion);

const PROFILE = {
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
  mResults.mockResolvedValue([]);
  mVisits.mockResolvedValue([]);
  mNotifs.mockResolvedValue([]);
});

describe("exportMyData", () => {
  it("scopes every read to the user, returns only their data, and logs RODO_EKSPORT", async () => {
    mProfile.mockResolvedValue(PROFILE);
    mResults.mockResolvedValue([
      {
        sumaPunktow: 12,
        poziomStresu: "MEDIUM",
        dataWypelnienia: new Date("2024-03-01"),
        odpowiedzi: [{ pytanieId: "p1", wartosc: 3 }],
      },
    ]);
    mNotifs.mockResolvedValue([
      {
        id: "n1",
        userId: "u1",
        typ: "SYSTEM",
        tresc: "hi",
        przeczytane: false,
        createdAt: new Date("2024-03-02"),
      },
    ] as never);

    const dto = await exportMyData("u1");

    expect(mProfile).toHaveBeenCalledWith("u1");
    expect(mResults).toHaveBeenCalledWith("u1");
    expect(mVisits).toHaveBeenCalledWith("u1");
    expect(mNotifs).toHaveBeenCalledWith("u1");

    expect(Object.keys(dto).sort()).toEqual(["powiadomienia", "profil", "wizyty", "wyniki"]);
    expect(dto.profil).not.toHaveProperty("hasloHash");
    // Notifications are slimmed — internal id/userId never reach the export.
    expect(dto.powiadomienia[0]).toEqual({
      typ: "SYSTEM",
      tresc: "hi",
      przeczytane: false,
      createdAt: new Date("2024-03-02"),
    });
    expect(mLogExport).toHaveBeenCalledWith({ userId: "u1", login: "jan" });
  });

  it("throws NotFoundError for an unknown user and does not log an export", async () => {
    mProfile.mockResolvedValue(null);
    await expect(exportMyData("ghost")).rejects.toBeInstanceOf(NotFoundError);
    expect(mLogExport).not.toHaveBeenCalled();
  });
});

describe("deleteMyAccount", () => {
  it("reads login, deletes the user, then logs RODO_USUNIECIE (delete before log)", async () => {
    mLogin.mockResolvedValue({ login: "jan" });
    mDelete.mockResolvedValue({ id: "u1" });

    await deleteMyAccount("u1");

    expect(mLogin).toHaveBeenCalledWith("u1");
    expect(mDelete).toHaveBeenCalledWith("u1");
    expect(mLogDelete).toHaveBeenCalledWith({ login: "jan" });
    expect(mDelete.mock.invocationCallOrder[0]).toBeLessThan(
      mLogDelete.mock.invocationCallOrder[0],
    );
  });

  it("throws NotFoundError and does not delete when the user is gone", async () => {
    mLogin.mockResolvedValue(null);
    await expect(deleteMyAccount("ghost")).rejects.toBeInstanceOf(NotFoundError);
    expect(mDelete).not.toHaveBeenCalled();
    expect(mLogDelete).not.toHaveBeenCalled();
  });
});
