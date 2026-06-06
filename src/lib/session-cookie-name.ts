/**
 * Session cookie name — the single edge-safe constant shared by the Node cookie I/O
 * ({@link file://./session-cookie.ts}) and the edge middleware. No Prisma, no `node:crypto`,
 * no `cookies()`, so it is safe to import from the Edge runtime.
 */
export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "zenly_session";
