import { describe, it, expect } from "vitest";
import { shouldLockAccount } from "@/server/domain/account-lock";

describe("shouldLockAccount", () => {
  it("does not lock below 5 failed attempts", () => {
    expect(shouldLockAccount(4)).toBe(false);
  });

  it("locks at exactly 5 failed attempts", () => {
    expect(shouldLockAccount(5)).toBe(true);
  });

  it("locks above 5 failed attempts", () => {
    expect(shouldLockAccount(6)).toBe(true);
  });
});
