import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/services/auth.service";
import { getMyResults } from "@/server/services/survey.service";
import { Sidebar } from "@/components/Sidebar";

// Auth runs per request; never statically rendered.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireUser(); // redirects to /login when unauthenticated

  // RB-06: the first survey is mandatory for employees — until it is completed, every (app) route
  // bounces to /ankieta (so the non-closable modal cannot be side-stepped via the sidebar).
  if (session.rola === "EMPLOYEE") {
    const pathname = (await headers()).get("x-pathname") ?? "";
    // Fail-open when the path is unknown (header missing): only redirect when we can confirm we are
    // NOT already on /ankieta, so the gate can never redirect the survey page onto itself (loop).
    if (pathname && !pathname.startsWith("/ankieta")) {
      const results = await getMyResults(session.userId);
      if (results.length === 0) {
        redirect("/ankieta");
      }
    }
  }

  return (
    <div className="flex min-h-screen gap-6 p-6">
      <Sidebar rola={session.rola} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
