import { ZodError } from "zod";
import { unstable_rethrow } from "next/navigation";
import {
  ValidationError,
  SurveyNotActiveError,
  AccessDeniedError,
  NotFoundError,
  SlotAlreadyTakenError,
  CsrfError,
  AuthRequiredError,
  CredentialsTakenError,
  InvalidCredentialsError,
  AccountLockedError,
} from "@/server/domain/errors";

/** Stable, client-safe error codes a Server Action can return (the UI switches on these). */
export type ActionErrorCode =
  | "VALIDATION"
  | "SURVEY_NOT_ACTIVE"
  | "SURVEY_NOT_DUE"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "SLOT_TAKEN"
  | "CSRF"
  | "UNAUTHENTICATED"
  | "CONFLICT"
  | "AUTH_INVALID"
  | "AUTH_LOCKED"
  | "INTERNAL";

/** A safe error payload: a stable code, a user-facing message, and optional per-field messages. */
export interface ActionError {
  code: ActionErrorCode;
  message: string;
  fieldErrors?: Record<string, string[]>;
}

/** Discriminated result of a Server Action: success carries `data`, failure carries a safe `error`. */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ActionError };

/** Wrap a successful value as an {@link ActionResult}. */
export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

/** Wrap a safe error as a failed {@link ActionResult}. */
export function fail(error: ActionError): ActionResult<never> {
  return { ok: false, error };
}

/** Drop empty/undefined entries so the field-error map is `Record<string, string[]>`. */
function pickFieldErrors(
  raw: Record<string, string[] | undefined>,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value && value.length > 0) out[key] = value;
  }
  return out;
}

/**
 * Map any thrown value to a safe {@link ActionError}. Known domain errors and Zod parse errors
 * get stable codes and user-facing messages; anything unexpected collapses to `INTERNAL` with a
 * generic message so internal details never leak to the client.
 *
 * @param err - The thrown value (Zod error, domain error, or anything else).
 * @returns A client-safe error payload.
 */
export function toActionError(err: unknown): ActionError {
  if (err instanceof ZodError) {
    const fieldErrors = err.flatten().fieldErrors as Record<
      string,
      string[] | undefined
    >;
    return {
      code: "VALIDATION",
      message: "Nieprawidłowe dane formularza.",
      fieldErrors: pickFieldErrors(fieldErrors),
    };
  }
  if (err instanceof ValidationError) {
    // Domain ValidationError messages are developer-facing (English); expose only a stable, safe
    // message. Per-field detail returns once domain errors carry machine codes translated here.
    return { code: "VALIDATION", message: "Nieprawidłowe dane." };
  }
  if (err instanceof SurveyNotActiveError) {
    return { code: "SURVEY_NOT_ACTIVE", message: "Ankieta jest nieaktywna lub niedostępna." };
  }
  if (err instanceof AccessDeniedError) {
    return { code: "FORBIDDEN", message: "Brak uprawnień." };
  }
  if (err instanceof NotFoundError) {
    return { code: "NOT_FOUND", message: "Nie znaleziono zasobu." };
  }
  if (err instanceof SlotAlreadyTakenError) {
    return { code: "SLOT_TAKEN", message: "Termin został już zajęty." };
  }
  if (err instanceof CsrfError) {
    return { code: "CSRF", message: "Nieprawidłowe źródło żądania." };
  }
  if (err instanceof AuthRequiredError) {
    return { code: "UNAUTHENTICATED", message: "Wymagane logowanie." };
  }
  if (err instanceof CredentialsTakenError) {
    return { code: "CONFLICT", message: "Login lub e-mail jest już zajęty." };
  }
  if (err instanceof InvalidCredentialsError) {
    // Generic on purpose: same message for unknown login and wrong password (anti-enumeration).
    return { code: "AUTH_INVALID", message: "Nieprawidłowy login lub hasło." };
  }
  if (err instanceof AccountLockedError) {
    return {
      code: "AUTH_LOCKED",
      message: "Konto jest tymczasowo zablokowane. Spróbuj ponownie później.",
    };
  }
  return { code: "INTERNAL", message: "Wystąpił błąd. Spróbuj ponownie." };
}

/**
 * Run a Server Action body and funnel every throw — Zod parse errors, the CSRF guard, and domain
 * errors — through {@link toActionError}. Keeps action bodies linear (no inline try/catch).
 *
 * @param fn - The action body; its resolved value becomes `data`.
 * @returns `ok(data)` on success, otherwise `fail(safeError)`.
 */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return ok(await fn());
  } catch (err) {
    // Next control-flow signals (redirect/notFound) throw too — let them propagate, or `redirect()`
    // inside an action would be swallowed into INTERNAL and navigation would silently never happen.
    unstable_rethrow(err);
    return fail(toActionError(err));
  }
}
