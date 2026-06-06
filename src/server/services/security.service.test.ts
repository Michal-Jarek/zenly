import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  logAccessDenied,
  logDataExport,
  logAccountDeletion,
} from "@/server/services/security.service";
import { createSecurityEvent } from "@/server/data/securityEvent.repository";
import { getClientIp } from "@/lib/request-ip";

vi.mock("@/server/data/securityEvent.repository", () => ({
  createSecurityEvent: vi.fn(),
}));
vi.mock("@/lib/request-ip", () => ({
  getClientIp: vi.fn(),
}));

const mockedCreate = vi.mocked(createSecurityEvent);
const mockedIp = vi.mocked(getClientIp);

// The only payload keys the logger may ever forward — proves no password/answers field can leak.
const SAFE_KEYS = ["typ", "opis", "userId", "login", "ip"];

beforeEach(() => {
  vi.clearAllMocks();
  mockedIp.mockResolvedValue("203.0.113.7");
});

describe("security.service logger", () => {
  it("logAccessDenied records DOSTEP_ODMOWA with identity + ip", async () => {
    await logAccessDenied({ userId: "u1", opis: "Panel admin" });
    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        typ: "DOSTEP_ODMOWA",
        userId: "u1",
        opis: "Panel admin",
        ip: "203.0.113.7",
      }),
    );
  });

  it("logDataExport records RODO_EKSPORT for the acting user", async () => {
    await logDataExport({ userId: "u1", login: "jan" });
    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        typ: "RODO_EKSPORT",
        userId: "u1",
        login: "jan",
        ip: "203.0.113.7",
      }),
    );
  });

  it("logAccountDeletion records RODO_USUNIECIE by login (no userId — the row is gone)", async () => {
    await logAccountDeletion({ login: "jan" });
    const arg = mockedCreate.mock.calls[0][0];
    expect(arg.typ).toBe("RODO_USUNIECIE");
    expect(arg.login).toBe("jan");
    expect(arg.userId ?? null).toBeNull();
  });

  it("only ever forwards safe metadata (no password/answer fields)", async () => {
    await logAccessDenied({ userId: "u1", login: "jan", opis: "x" });
    await logDataExport({ userId: "u1", login: "jan" });
    await logAccountDeletion({ login: "jan" });
    for (const call of mockedCreate.mock.calls) {
      for (const key of Object.keys(call[0])) {
        expect(SAFE_KEYS).toContain(key);
      }
    }
  });
});
