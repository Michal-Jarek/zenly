import { describe, it, expect, vi, beforeEach } from "vitest";
import { headers } from "next/headers";
import { assertSameOrigin } from "@/lib/csrf";
import { CsrfError } from "@/server/domain/errors";

vi.mock("next/headers", () => ({ headers: vi.fn() }));

const mockedHeaders = vi.mocked(headers);

function setHeaders(map: Record<string, string>) {
  mockedHeaders.mockResolvedValue({
    get: (key: string) => map[key.toLowerCase()] ?? null,
  } as never);
}

describe("assertSameOrigin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves when the Origin host matches Host (port included)", async () => {
    setHeaders({ origin: "http://localhost:3000", host: "localhost:3000" });
    await expect(assertSameOrigin()).resolves.toBeUndefined();
  });

  it("rejects a cross-origin request", async () => {
    setHeaders({ origin: "http://evil.example", host: "localhost:3000" });
    await expect(assertSameOrigin()).rejects.toBeInstanceOf(CsrfError);
  });

  it("rejects a missing Origin header", async () => {
    setHeaders({ host: "localhost:3000" });
    await expect(assertSameOrigin()).rejects.toBeInstanceOf(CsrfError);
  });

  it("rejects a missing Host header", async () => {
    setHeaders({ origin: "http://localhost:3000" });
    await expect(assertSameOrigin()).rejects.toBeInstanceOf(CsrfError);
  });

  it("rejects a malformed Origin header", async () => {
    setHeaders({ origin: "not-a-url", host: "localhost:3000" });
    await expect(assertSameOrigin()).rejects.toBeInstanceOf(CsrfError);
  });

  it("rejects an opaque Origin (\"null\")", async () => {
    setHeaders({ origin: "null", host: "localhost:3000" });
    await expect(assertSameOrigin()).rejects.toBeInstanceOf(CsrfError);
  });

  it("matches the Host header case-insensitively", async () => {
    setHeaders({ origin: "http://localhost:3000", host: "LOCALHOST:3000" });
    await expect(assertSameOrigin()).resolves.toBeUndefined();
  });
});
