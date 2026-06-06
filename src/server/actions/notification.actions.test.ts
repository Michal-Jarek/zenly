import { describe, it, expect, vi, beforeEach } from "vitest";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/current-user";
import { markNotificationRead } from "@/server/services/notification.service";
import { NotFoundError } from "@/server/domain/errors";
import { markNotificationReadAction } from "@/server/actions/notification.actions";

vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/current-user", () => ({ getCurrentUserId: vi.fn() }));
vi.mock("@/server/services/notification.service", () => ({
  markNotificationRead: vi.fn(),
}));

const mockedHeaders = vi.mocked(headers);
const mockedRevalidate = vi.mocked(revalidatePath);
const mockedGetUser = vi.mocked(getCurrentUserId);
const mockedMarkRead = vi.mocked(markNotificationRead);

function setHeaders(map: Record<string, string>) {
  mockedHeaders.mockResolvedValue({
    get: (key: string) => map[key.toLowerCase()] ?? null,
  } as never);
}
const SAME = { origin: "http://localhost:3000", host: "localhost:3000" };
const CROSS = { origin: "http://evil.example", host: "localhost:3000" };
const VALID_INPUT = { id: "n1" };

describe("markNotificationReadAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setHeaders(SAME);
    mockedGetUser.mockResolvedValue("user-1");
  });

  it("rejects invalid input without calling the service", async () => {
    const result = await markNotificationReadAction({ id: "" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("VALIDATION");
    expect(mockedMarkRead).not.toHaveBeenCalled();
  });

  it("rejects a cross-origin request", async () => {
    setHeaders(CROSS);
    const result = await markNotificationReadAction(VALID_INPUT);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("CSRF");
    expect(mockedMarkRead).not.toHaveBeenCalled();
  });

  it("runs the CSRF guard before validation (cross-origin + malformed input -> CSRF)", async () => {
    setHeaders(CROSS);
    const result = await markNotificationReadAction({ id: "" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("CSRF");
    expect(mockedMarkRead).not.toHaveBeenCalled();
  });

  it("maps NotFoundError to NOT_FOUND without revalidating", async () => {
    mockedMarkRead.mockRejectedValue(new NotFoundError());
    const result = await markNotificationReadAction(VALID_INPUT);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("NOT_FOUND");
    expect(mockedRevalidate).not.toHaveBeenCalled();
  });

  it("collapses an unexpected service error to INTERNAL without leaking or revalidating", async () => {
    mockedMarkRead.mockRejectedValue(new Error("secret SQL details"));
    const result = await markNotificationReadAction(VALID_INPUT);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("INTERNAL");
    expect(result.error.message).not.toContain("secret SQL");
    expect(mockedRevalidate).not.toHaveBeenCalled();
  });

  it("succeeds with empty data and revalidates on a valid request", async () => {
    mockedMarkRead.mockResolvedValue(undefined);
    const result = await markNotificationReadAction(VALID_INPUT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toBeUndefined();
    expect(mockedMarkRead).toHaveBeenCalledWith("user-1", "n1");
    expect(mockedRevalidate).toHaveBeenCalledWith("/dashboard");
  });
});
