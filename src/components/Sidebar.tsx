"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import type { Rola } from "@/server/domain/types";
import { logoutAction } from "@/server/actions/auth.actions";

const NAV = [
  { href: "/dashboard", label: "Strona główna" },
  { href: "/oddech", label: "Oddech" },
  { href: "/medytacja", label: "Medytacja" },
  { href: "/muzyka", label: "Muzyka relaksacyjna" },
  { href: "/cwiczenia", label: "Ćwiczenia fizyczne" },
  { href: "/konsultacja", label: "Konsultacja" },
  { href: "/ankieta", label: "Ankieta" },
];

const PANEL_BY_ROLE: Partial<Record<Rola, { href: string; label: string }>> = {
  ADMIN: { href: "/admin", label: "Panel administratora" },
  HR: { href: "/hr", label: "Panel HR" },
  PSYCHOLOGIST: { href: "/psycholog", label: "Panel psychologa" },
};

export function Sidebar({ rola }: { rola: Rola }) {
  const pathname = usePathname();
  const panel = PANEL_BY_ROLE[rola];
  const items = panel ? [...NAV, panel] : NAV;

  return (
    <aside className="flex w-60 shrink-0 flex-col rounded-2xl bg-white p-6">
      <Link href="/dashboard" className="px-2 text-3xl font-bold tracking-tight">
        Zenly.
      </Link>
      <hr className="my-5 border-neutral-200" />

      <nav className="flex flex-1 flex-col gap-1" aria-label="Nawigacja główna">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center justify-between rounded-lg px-2 py-2 text-sm ${
                active
                  ? "font-semibold text-neutral-900"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              <span>{item.label}</span>
              {active && <span aria-hidden="true">›</span>}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 flex items-center gap-4 px-2 text-neutral-700">
        <Link href="/ustawienia" aria-label="Profil" className="hover:text-neutral-900">
          <PersonIcon />
        </Link>
        <Link href="/ustawienia" aria-label="Ustawienia" className="hover:text-neutral-900">
          <GearIcon />
        </Link>
        <LogoutButton />
      </div>
    </aside>
  );
}

function LogoutButton() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      aria-label="Wyloguj się"
      disabled={pending}
      onClick={() => startTransition(() => void logoutAction())}
      className="hover:text-neutral-900 disabled:opacity-50"
    >
      <LogoutIcon />
    </button>
  );
}

function PersonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.42 0-8 2.69-8 6v2h16v-2c0-3.31-3.58-6-8-6Z" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm9 4-2.1-.6a6.9 6.9 0 0 0-.5-1.3l1.1-1.9-1.4-1.4-1.9 1.1c-.4-.2-.9-.4-1.3-.5L14 3h-2l-.6 2.1c-.5.1-.9.3-1.3.5L8.2 4.5 6.8 5.9l1.1 1.9c-.2.4-.4.9-.5 1.3L5 9.7v2l2.1.6c.1.5.3.9.5 1.3l-1.1 1.9 1.4 1.4 1.9-1.1c.4.2.9.4 1.3.5l.6 2.1h2l.6-2.1c.5-.1.9-.3 1.3-.5l1.9 1.1 1.4-1.4-1.1-1.9c.2-.4.4-.9.5-1.3l2.1-.6v-2Z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4v-2H6V6h4V4Zm7.5 4-1.4 1.4 1.6 1.6H9v2h7.7l-1.6 1.6 1.4 1.4 4-4-4-4Z" />
    </svg>
  );
}
