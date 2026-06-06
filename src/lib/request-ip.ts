import { headers } from "next/headers";

/**
 * Best-effort client IP for the security audit log. Reads the standard reverse-proxy headers
 * (`x-forwarded-for` first hop, then `x-real-ip`); returns `null` when none is present (e.g. local
 * Docker without a proxy) so the caller stores `null` rather than a misleading value.
 *
 * Request-scoped: only valid inside a Server Action / RSC (where `headers()` resolves).
 *
 * @returns The client IP, or `null` when it cannot be determined.
 */
export async function getClientIp(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip")?.trim() || null;
}
