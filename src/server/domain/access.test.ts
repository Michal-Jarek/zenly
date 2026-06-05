import { describe, it, expect } from "vitest";
import { assertOwnsResult } from "@/server/domain/access";
import { AccessDeniedError } from "@/server/domain/errors";

describe("assertOwnsResult (RB-29)", () => {
  it("allows the owner", () => {
    const user = { id: "user-1", rola: "EMPLOYEE" as const };
    expect(() => assertOwnsResult(user, { userId: "user-1" })).not.toThrow();
  });

  it("denies another employee", () => {
    const user = { id: "user-2", rola: "EMPLOYEE" as const };
    expect(() => assertOwnsResult(user, { userId: "user-1" })).toThrow(AccessDeniedError);
  });

  it("denies HR on an individual result (HR uses the aggregate only)", () => {
    const hr = { id: "hr-1", rola: "HR" as const };
    expect(() => assertOwnsResult(hr, { userId: "user-1" })).toThrow(AccessDeniedError);
  });
});
