import { describe, it, expect, vi, beforeEach } from "vitest";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/current-user";
import { submitSurvey, isSurveyDue } from "@/server/services/survey.service";
import { SurveyNotActiveError } from "@/server/domain/errors";
import { submitSurveyAction } from "@/server/actions/survey.actions";

vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/current-user", () => ({ getCurrentUserId: vi.fn() }));
vi.mock("@/server/services/survey.service", () => ({
  submitSurvey: vi.fn(),
  isSurveyDue: vi.fn(),
}));

const mockedHeaders = vi.mocked(headers);
const mockedRevalidate = vi.mocked(revalidatePath);
const mockedGetUser = vi.mocked(getCurrentUserId);
const mockedSubmit = vi.mocked(submitSurvey);
const mockedIsDue = vi.mocked(isSurveyDue);

function setHeaders(map: Record<string, string>) {
  mockedHeaders.mockResolvedValue({
    get: (key: string) => map[key.toLowerCase()] ?? null,
  } as never);
}
const SAME = { origin: "http://localhost:3000", host: "localhost:3000" };
const CROSS = { origin: "http://evil.example", host: "localhost:3000" };
const VALID_INPUT = { ankietaId: "seed-ankieta-stres-v1", answers: Array(10).fill(3) };

describe("submitSurveyAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setHeaders(SAME);
    mockedGetUser.mockResolvedValue("user-1");
    mockedIsDue.mockResolvedValue(true);
  });

  it("rejects invalid input without calling the service", async () => {
    const result = await submitSurveyAction({ ankietaId: "a1", answers: [1, 2, 3] });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("VALIDATION");
    expect(mockedSubmit).not.toHaveBeenCalled();
  });

  it("rejects a cross-origin request", async () => {
    setHeaders(CROSS);
    const result = await submitSurveyAction(VALID_INPUT);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("CSRF");
    expect(mockedSubmit).not.toHaveBeenCalled();
  });

  it("runs the CSRF guard before validation (cross-origin + malformed input -> CSRF)", async () => {
    setHeaders(CROSS);
    const result = await submitSurveyAction({ ankietaId: "a1", answers: [1] });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("CSRF");
    expect(mockedSubmit).not.toHaveBeenCalled();
  });

  it("refuses submission when the survey is not due (RB-07), service not called", async () => {
    mockedIsDue.mockResolvedValue(false);
    const result = await submitSurveyAction(VALID_INPUT);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("SURVEY_NOT_DUE");
    expect(mockedSubmit).not.toHaveBeenCalled();
    expect(mockedRevalidate).not.toHaveBeenCalled();
  });

  it("maps a domain SurveyNotActiveError to its safe code without revalidating", async () => {
    mockedSubmit.mockRejectedValue(new SurveyNotActiveError());
    const result = await submitSurveyAction(VALID_INPUT);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("SURVEY_NOT_ACTIVE");
    expect(mockedRevalidate).not.toHaveBeenCalled();
  });

  it("collapses an unexpected service error to INTERNAL without leaking or revalidating", async () => {
    mockedSubmit.mockRejectedValue(new Error("secret SQL details"));
    const result = await submitSurveyAction(VALID_INPUT);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("INTERNAL");
    expect(result.error.message).not.toContain("secret SQL");
    expect(mockedRevalidate).not.toHaveBeenCalled();
  });

  it("returns the result and revalidates the dashboard on success", async () => {
    mockedSubmit.mockResolvedValue({
      poziomStresu: "MEDIUM",
      sumaPunktow: 18,
      recommendation: ["MUZYKA", "CWICZENIA", "MEDYTACJA"],
    });
    const result = await submitSurveyAction(VALID_INPUT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.poziomStresu).toBe("MEDIUM");
    expect(mockedIsDue).toHaveBeenCalledWith("user-1", expect.any(Date));
    expect(mockedSubmit).toHaveBeenCalledWith(
      "user-1",
      "seed-ankieta-stres-v1",
      VALID_INPUT.answers,
    );
    expect(mockedRevalidate).toHaveBeenCalledWith("/dashboard");
  });
});
