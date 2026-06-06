import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session-cookie-name";

// Edge-safe gate (Edge runtime: only next/server + cookie presence — no Prisma, no node:crypto).
// This is a coarse first line: it checks the cookie EXISTS and redirects anonymous users to /login.
// Full session validity (hash lookup, expiry, lock) runs in Node via authService.getSession.
export function middleware(req: NextRequest): NextResponse {
  const hasSession = req.cookies.has(SESSION_COOKIE_NAME);
  if (hasSession) {
    return NextResponse.next();
  }
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("from", req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

// Protected (app) routes only — real paths (route groups have no URL segment). Public routes
// (/login, /rejestracja), the Krok-0 health page ("/"), assets and APIs are intentionally excluded.
// The full route set is finalized when the UI lands in Krok 5.
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/ankieta/:path*",
    "/oddech/:path*",
    "/medytacja/:path*",
    "/muzyka/:path*",
    "/cwiczenia/:path*",
    "/konsultacja/:path*",
    "/ustawienia/:path*",
  ],
};
