import { describe, it, expect } from "vitest";
import { validatePasswordStrength } from "@/server/domain/password";

describe("validatePasswordStrength", () => {
  it("rejects a too-short password (11 chars) at the boundary", () => {
    // 11 chars, otherwise covers every class.
    const result = validatePasswordStrength("Aa1!aaaaaaa");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Password must be at least 12 characters long.");
  });

  it("accepts a password at exactly 12 chars covering every class", () => {
    expect(validatePasswordStrength("Aa1!aaaaaaaa").valid).toBe(true);
  });

  it("reports the specific missing character class", () => {
    expect(validatePasswordStrength("aaaaaaaaaaa1!").errors).toContain(
      "Password must contain an uppercase letter.",
    );
    expect(validatePasswordStrength("AAAAAAAAAAA1!").errors).toContain(
      "Password must contain a lowercase letter.",
    );
    expect(validatePasswordStrength("Aaaaaaaaaaaa!").errors).toContain(
      "Password must contain a digit.",
    );
    expect(validatePasswordStrength("Aaaaaaaaaaa12").errors).toContain(
      "Password must contain a special character.",
    );
  });

  it("accepts a strong password", () => {
    const result = validatePasswordStrength("Zenly!Demo2026#Pass");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
