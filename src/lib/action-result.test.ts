import { describe, it, expect } from "vitest";
import { z } from "zod";
import { ok, fail, toActionError, runAction } from "@/lib/action-result";
import {
  ValidationError,
  SurveyNotActiveError,
  AccessDeniedError,
  NotFoundError,
  SlotAlreadyTakenError,
  CsrfError,
} from "@/server/domain/errors";

describe("ok / fail", () => {
  it("wraps success and failure into the discriminated shape", () => {
    expect(ok(42)).toEqual({ ok: true, data: 42 });
    expect(fail({ code: "NOT_FOUND", message: "x" })).toEqual({
      ok: false,
      error: { code: "NOT_FOUND", message: "x" },
    });
  });
});

describe("toActionError — domain error mapping", () => {
  it("maps each domain error to its stable code", () => {
    expect(toActionError(new SurveyNotActiveError()).code).toBe("SURVEY_NOT_ACTIVE");
    expect(toActionError(new AccessDeniedError()).code).toBe("FORBIDDEN");
    expect(toActionError(new NotFoundError()).code).toBe("NOT_FOUND");
    expect(toActionError(new SlotAlreadyTakenError()).code).toBe("SLOT_TAKEN");
    expect(toActionError(new CsrfError()).code).toBe("CSRF");
  });

  it("maps a domain ValidationError to a safe VALIDATION message without leaking raw detail", () => {
    const error = toActionError(new ValidationError(["Survey expects 10 answers, got 3."]));
    expect(error.code).toBe("VALIDATION");
    expect(error.message).toBe("Nieprawidłowe dane.");
    expect(error.fieldErrors).toBeUndefined();
  });

  it("maps a ZodError to VALIDATION with per-field messages", () => {
    const schema = z.object({ terminId: z.string().min(1) });
    const parsed = schema.safeParse({ terminId: "" });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const error = toActionError(parsed.error);
    expect(error.code).toBe("VALIDATION");
    expect(error.fieldErrors?.terminId?.length).toBeGreaterThan(0);
  });

  it("collapses unknown errors to INTERNAL without leaking the message", () => {
    const error = toActionError(new Error("secret SQL details"));
    expect(error.code).toBe("INTERNAL");
    expect(error.message).not.toContain("secret SQL");
  });
});

describe("runAction", () => {
  it("returns ok(data) when the body resolves", async () => {
    await expect(runAction(async () => "value")).resolves.toEqual({
      ok: true,
      data: "value",
    });
  });

  it("returns a mapped failure when the body throws", async () => {
    const result = await runAction(async () => {
      throw new SlotAlreadyTakenError();
    });
    expect(result).toEqual({
      ok: false,
      error: { code: "SLOT_TAKEN", message: "Termin został już zajęty." },
    });
  });
});
