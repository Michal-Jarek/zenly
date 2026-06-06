"use client";

import { useTransition } from "react";
import { logoutAction } from "@/server/actions/auth.actions";

/** Text logout button (settings page). */
export function LogoutButton() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => void logoutAction())}
      className="rounded-xl bg-black px-6 py-3 font-semibold text-white disabled:opacity-50"
    >
      {pending ? "Wylogowywanie…" : "Wyloguj się"}
    </button>
  );
}
