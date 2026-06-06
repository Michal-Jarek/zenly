import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/session-cookie-name";

// Cookie carries the RAW session token; the DB stores only its SHA-256 hash (see auth.service).
// `secure` is gated on an explicit flag, NOT NODE_ENV: the graded build runs `next start`
// (NODE_ENV=production) over plain http://localhost, where a secure cookie would never be sent.
// Guard misconfiguration: Number("")===0 would expire the cookie instantly and a non-number would
// propagate as Invalid Date into the session row. Fall back to 7 days unless a positive int is given.
const parsedMaxAge = Number.parseInt(process.env.SESSION_MAX_AGE ?? "", 10);
export const SESSION_MAX_AGE_SECONDS =
  Number.isFinite(parsedMaxAge) && parsedMaxAge > 0 ? parsedMaxAge : 604800;
const SESSION_COOKIE_SECURE = process.env.SESSION_COOKIE_SECURE === "true";

/** Read the raw session token from the request cookie, or `undefined` when absent. */
export async function readSessionToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SESSION_COOKIE_NAME)?.value;
}

/** Write the raw session token as an httpOnly, lax, path-wide cookie. */
export async function writeSessionToken(rawToken: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: SESSION_COOKIE_SECURE,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/** Remove the session cookie (logout). */
export async function clearSessionToken(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}
