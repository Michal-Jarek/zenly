import { describe, it, expect, vi, beforeEach } from "vitest";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/current-user";
import { bookConsultation } from "@/server/services/consultation.service";
import { SlotAlreadyTakenError, NotFoundError } from "@/server/domain/errors";
import { bookConsultationAction } from "@/server/actions/consultation.actions";

vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/current-user", () => ({ getCurrentUserId: vi.fn() }));
vi.mock("@/server/services/consultation.service", () => ({
  bookConsultation: vi.fn(),
}));

const mockedHeaders = vi.mocked(headers);
const mockedRevalidate = vi.mocked(revalidatePath);
const mockedGetUser = vi.mocked(getCurrentUserId);
const mockedBook = vi.mocked(bookConsultation);

function setHeaders(map: Record<string, string>) {
  mockedHeaders.mockResolvedValue({
    get: (key: string) => map[key.toLowerCase()] ?? null,
  } as never);
}
const SAME = { origin: "http://localhost:3000", host: "localhost:3000" };
const CROSS = { origin: "http://evil.example", host: "localhost:3000" };
const VALID_INPUT = { terminId: "seed-term-seed-psy-1-1" };

describe("bookConsultationAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setHeaders(SAME);
    mockedGetUser.mockResolvedValue("user-1");
  });

  it("rejects invalid input without calling the service", async () => {
    const result = await bookConsultationAction({ terminId: "" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("VALIDATION");
    expect(mockedBook).not.toHaveBeenCalled();
  });

  it("rejects a cross-origin request", async () => {
    setHeaders(CROSS);
    const result = await bookConsultationAction(VALID_INPUT);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("CSRF");
    expect(mockedBook).not.toHaveBeenCalled();
  });

  it("runs the CSRF guard before validation (cross-origin + malformed input -> CSRF)", async () => {
    setHeaders(CROSS);
    const result = await bookConsultationAction({ terminId: "" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("CSRF");
    expect(mockedBook).not.toHaveBeenCalled();
  });

  it("maps SlotAlreadyTakenError to SLOT_TAKEN without revalidating", async () => {
    mockedBook.mockRejectedValue(new SlotAlreadyTakenError());
    const result = await bookConsultationAction(VALID_INPUT);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("SLOT_TAKEN");
    expect(mockedRevalidate).not.toHaveBeenCalled();
  });

  it("maps NotFoundError to NOT_FOUND without revalidating", async () => {
    mockedBook.mockRejectedValue(new NotFoundError());
    const result = await bookConsultationAction(VALID_INPUT);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("NOT_FOUND");
    expect(mockedRevalidate).not.toHaveBeenCalled();
  });

  it("collapses an unexpected service error to INTERNAL without leaking or revalidating", async () => {
    mockedBook.mockRejectedValue(new Error("secret SQL details"));
    const result = await bookConsultationAction(VALID_INPUT);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("INTERNAL");
    expect(result.error.message).not.toContain("secret SQL");
    expect(mockedRevalidate).not.toHaveBeenCalled();
  });

  it("returns a slim DTO and revalidates on success", async () => {
    mockedBook.mockResolvedValue({ id: "v1" } as never);
    const result = await bookConsultationAction(VALID_INPUT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual({ id: "v1" });
    expect(mockedBook).toHaveBeenCalledWith("user-1", "seed-term-seed-psy-1-1");
    expect(mockedRevalidate).toHaveBeenCalledWith("/konsultacja");
  });
});
