"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { runAction, type ActionResult } from "@/lib/action-result";
import { assertSameOrigin } from "@/lib/csrf";
import { register, login, logout } from "@/server/services/auth.service";

const RegisterSchema = z.object({
  imie: z.string().min(1),
  nazwisko: z.string().min(1),
  login: z.string().min(3),
  email: z.string().email(),
  haslo: z.string().min(1), // strength enforced in the domain (validatePasswordStrength)
});

const LoginSchema = z.object({
  login: z.string().min(1),
  haslo: z.string().min(1),
  from: z.string().optional(),
});

/** Allow only same-site relative paths as a post-login target (open-redirect guard). */
function safeRedirectTarget(from?: string): string {
  if (from && from.startsWith("/") && !from.startsWith("//")) return from;
  return "/dashboard";
}

/**
 * Register a new account, then redirect to the login page. Thin transport: same-origin guard,
 * shape validation, delegate to the service; domain errors map to safe codes (e.g. `CONFLICT`).
 *
 * @param input - Expected `{ imie, nazwisko, login, email, haslo }`.
 * @returns A safe error on failure; on success it redirects (never resolves with data).
 */
export async function registerAction(input: unknown): Promise<ActionResult<void>> {
  return runAction(async () => {
    await assertSameOrigin();
    const data = RegisterSchema.parse(input);
    await register(data);
    redirect("/login");
  });
}

/**
 * Authenticate and redirect to the dashboard. The redirect propagates via `unstable_rethrow`
 * in {@link runAction} (it is not swallowed into INTERNAL).
 *
 * @param input - Expected `{ login, haslo }`.
 * @returns A safe error on failure (e.g. `AUTH_INVALID`, `AUTH_LOCKED`); on success it redirects.
 */
export async function loginAction(input: unknown): Promise<ActionResult<void>> {
  return runAction(async () => {
    await assertSameOrigin();
    const { login: loginValue, haslo, from } = LoginSchema.parse(input);
    // TODO Krok 6: resolve client ip (headers x-forwarded-for) and pass it as login(...,ip) so it
    // lands in SecurityEvent.ip. Until then the `ip?` seam stays null (no reverse-proxy locally).
    await login(loginValue, haslo);
    redirect(safeRedirectTarget(from));
  });
}

/**
 * Log out the current user and redirect to the login page.
 *
 * @returns A safe error on failure; on success it redirects.
 */
export async function logoutAction(): Promise<ActionResult<void>> {
  return runAction(async () => {
    await assertSameOrigin();
    await logout();
    redirect("/login");
  });
}
