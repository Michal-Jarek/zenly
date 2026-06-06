"use client";

import { useEffect, useState } from "react";
import { startBreakTimer } from "@/server/domain/break-timer";
import { formatTime } from "@/lib/format";

// Suggested break length shown in the window (RB-22 cadence is 55 min of work, then a short break).
const BREAK_WINDOW_MS = 15 * 60_000;

/**
 * "Pora na przerwę" — schedules the RB-22 break reminder (client-side) and shows the next
 * suggested break window. Computed on mount to avoid a server/client time hydration mismatch.
 */
export function BreakTimerCard() {
  const [window, setWindow] = useState<{ start: string; end: string } | null>(null);
  const [due, setDue] = useState(false);

  useEffect(() => {
    const start = new Date();
    const end = new Date(start.getTime() + BREAK_WINDOW_MS);
    setWindow({ start: formatTime(start), end: formatTime(end) });
    const timer = startBreakTimer(() => setDue(true));
    return () => timer.cancel();
  }, []);

  return (
    <div className="rounded-2xl border-2 border-dashed border-neutral-300 p-6">
      <h2 className="text-lg font-semibold">Pora na przerwę</h2>
      {due ? (
        <p className="mt-2 text-sm">Czas na krótką przerwę — odpocznij chwilę.</p>
      ) : window ? (
        <p className="mt-2 text-lg">
          {window.start} - {window.end}
        </p>
      ) : (
        <p className="mt-2 text-lg text-neutral-400">—</p>
      )}
    </div>
  );
}
