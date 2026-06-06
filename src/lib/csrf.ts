import { headers } from "next/headers";
import { CsrfError } from "@/server/domain/errors";

/**
 * Same-origin guard for mutating Server Actions (defense-in-depth alongside Next.js' built-in
 * Origin/Host check). Compares the `Origin` header's host against the `Host` header. Mutations
 * must send `Origin`; a missing or mismatching one is rejected.
 *
 * Call at the very start of every mutating action.
 *
 * @throws {CsrfError} When `Origin` or `Host` is missing, `Origin` is malformed, or their hosts differ.
 */
export async function assertSameOrigin(): Promise<void> {
  const h = await headers(); // Next 15: headers() is async.
  const origin = h.get("origin");
  // Trusts the Host header (the local Docker setup has no reverse proxy). Behind a proxy in later
  // steps, align this with Next's X-Forwarded-Host handling.
  const host = h.get("host");
  if (!origin || !host) {
    throw new CsrfError("Missing Origin or Host header.");
  }
  let originHost: string;
  try {
    originHost = new URL(origin).host; // "https://app:3000" -> "app:3000"; also rejects "null".
  } catch {
    throw new CsrfError("Malformed Origin header.");
  }
  // Hosts are case-insensitive; URL() already lowercases its host, so normalize Host too.
  if (originHost.toLowerCase() !== host.toLowerCase()) {
    throw new CsrfError("Origin/Host mismatch.");
  }
}
