import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  submitSurvey,
  getResult,
  isSurveyDue,
} from "@/server/services/survey.service";
import {
  ValidationError,
  SurveyNotActiveError,
  NotFoundError,
  AccessDeniedError,
} from "@/server/domain/errors";
import { getAnkietaWithPytania } from "@/server/data/ankieta.repository";
import {
  createWynikWithOdpowiedzi,
  getResultById,
  getLatestResultByUser,
} from "@/server/data/wynik.repository";
import { findUserById } from "@/server/data/user.repository";

// Mock the data layer so the service tests never touch Prisma / the database.
vi.mock("@/server/data/ankieta.repository", () => ({
  getAnkietaWithPytania: vi.fn(),
}));
vi.mock("@/server/data/wynik.repository", () => ({
  createWynikWithOdpowiedzi: vi.fn(),
  getResultsByUser: vi.fn(),
  getResultById: vi.fn(),
  getLatestResultByUser: vi.fn(),
}));
vi.mock("@/server/data/user.repository", () => ({
  countUsers: vi.fn(),
  findUserById: vi.fn(),
}));

const mockedGetAnkieta = vi.mocked(getAnkietaWithPytania);
const mockedCreateWynik = vi.mocked(createWynikWithOdpowiedzi);
const mockedGetResultById = vi.mocked(getResultById);
const mockedGetLatest = vi.mocked(getLatestResultByUser);
const mockedFindUser = vi.mocked(findUserById);

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-06-06T12:00:00.000Z");

function buildPytania(n: number): { id: string; kolejnosc: number }[] {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, kolejnosc: i + 1 }));
}

describe("submitSurvey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("scores answers, persists the result and recommends modules", async () => {
    mockedGetAnkieta.mockResolvedValue({ id: "a1", aktywna: true, pytania: buildPytania(10) });
    mockedCreateWynik.mockResolvedValue({} as never);

    const answers = [2, 2, 2, 2, 2, 2, 2, 2, 1, 1]; // sum 18 -> MEDIUM
    const result = await submitSurvey("user-1", "a1", answers);

    expect(result.sumaPunktow).toBe(18);
    expect(result.poziomStresu).toBe("MEDIUM");
    expect(result.recommendation).toContain("MUZYKA");

    expect(mockedCreateWynik).toHaveBeenCalledOnce();
    const arg = mockedCreateWynik.mock.calls[0][0];
    expect(arg.userId).toBe("user-1");
    expect(arg.poziomStresu).toBe("MEDIUM");
    expect(arg.odpowiedzi).toEqual([
      { pytanieId: "p1", wartosc: 2 },
      { pytanieId: "p2", wartosc: 2 },
      { pytanieId: "p3", wartosc: 2 },
      { pytanieId: "p4", wartosc: 2 },
      { pytanieId: "p5", wartosc: 2 },
      { pytanieId: "p6", wartosc: 2 },
      { pytanieId: "p7", wartosc: 2 },
      { pytanieId: "p8", wartosc: 2 },
      { pytanieId: "p9", wartosc: 1 },
      { pytanieId: "p10", wartosc: 1 },
    ]);
  });

  it("rejects invalid answers without touching the database", async () => {
    await expect(submitSurvey("user-1", "a1", [1, 2, 3])).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(mockedGetAnkieta).not.toHaveBeenCalled();
    expect(mockedCreateWynik).not.toHaveBeenCalled();
  });

  it("rejects a missing or inactive survey", async () => {
    const valid = Array(10).fill(3);

    mockedGetAnkieta.mockResolvedValueOnce(null);
    await expect(submitSurvey("user-1", "a1", valid)).rejects.toBeInstanceOf(
      SurveyNotActiveError,
    );

    mockedGetAnkieta.mockResolvedValueOnce({ id: "a1", aktywna: false, pytania: buildPytania(10) });
    await expect(submitSurvey("user-1", "a1", valid)).rejects.toBeInstanceOf(
      SurveyNotActiveError,
    );

    expect(mockedCreateWynik).not.toHaveBeenCalled();
  });

  it("rejects when the answer count does not match the survey", async () => {
    mockedGetAnkieta.mockResolvedValue({ id: "a1", aktywna: true, pytania: buildPytania(8) });
    await expect(submitSurvey("user-1", "a1", Array(10).fill(3))).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(mockedCreateWynik).not.toHaveBeenCalled();
  });
});

describe("getResult (RB-29 ownership wiring)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws NotFound when the user does not exist", async () => {
    mockedFindUser.mockResolvedValue(null);
    await expect(getResult("user-1", "w1")).rejects.toBeInstanceOf(NotFoundError);
    expect(mockedGetResultById).not.toHaveBeenCalled();
  });

  it("throws NotFound when the result does not exist", async () => {
    mockedFindUser.mockResolvedValue({ id: "user-1", rola: "EMPLOYEE" });
    mockedGetResultById.mockResolvedValue(null);
    await expect(getResult("user-1", "w1")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws AccessDenied when the user does not own the result", async () => {
    mockedFindUser.mockResolvedValue({ id: "user-1", rola: "EMPLOYEE" });
    mockedGetResultById.mockResolvedValue({ id: "w1", userId: "user-2" } as never);
    await expect(getResult("user-1", "w1")).rejects.toBeInstanceOf(AccessDeniedError);
  });

  it("returns the result for its owner", async () => {
    const wynik = { id: "w1", userId: "user-1" };
    mockedFindUser.mockResolvedValue({ id: "user-1", rola: "EMPLOYEE" });
    mockedGetResultById.mockResolvedValue(wynik as never);
    await expect(getResult("user-1", "w1")).resolves.toBe(wynik);
  });
});

describe("isSurveyDue (RB-07 wiring)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is due when the user has no prior survey", async () => {
    mockedGetLatest.mockResolvedValue(null);
    await expect(isSurveyDue("user-1", NOW)).resolves.toBe(true);
  });

  it("is not due 15 days after the last survey", async () => {
    mockedGetLatest.mockResolvedValue({
      dataWypelnienia: new Date(NOW.getTime() - 15 * MS_PER_DAY),
    });
    await expect(isSurveyDue("user-1", NOW)).resolves.toBe(false);
  });
});
