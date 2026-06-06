"use client";

import { useState, useTransition } from "react";
import { markNotificationReadAction } from "@/server/actions/notification.actions";
import { Card } from "@/components/Card";

export type NotificationItem = { id: string; tresc: string };

/** In-app notifications (RB-24): shows unread notices and marks them read (markNotificationReadAction). */
export function NotificationsCard({ items }: { items: NotificationItem[] }) {
  // Track locally-marked ids and derive the visible list from props, so the card still reflects
  // fresh `items` after a server revalidation (instead of freezing the initial prop in state).
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const list = items.filter((n) => !readIds.has(n.id));
  if (list.length === 0) return null;

  function markRead(id: string) {
    setPendingId(id);
    startTransition(async () => {
      const res = await markNotificationReadAction({ id });
      if (res.ok) {
        setReadIds((prev) => new Set(prev).add(id));
      }
      setPendingId(null);
    });
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold">Powiadomienia</h2>
      <ul className="mt-3 flex flex-col gap-3">
        {list.map((n) => (
          <li
            key={n.id}
            className="flex items-start justify-between gap-3 rounded-lg bg-neutral-50 p-3"
          >
            <span className="text-sm">{n.tresc}</span>
            <button
              type="button"
              onClick={() => markRead(n.id)}
              disabled={pendingId === n.id}
              className="shrink-0 text-xs font-medium text-neutral-500 underline hover:text-neutral-900 disabled:opacity-50"
            >
              Oznacz jako przeczytane
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
