const DEFAULT_BREAK_MS = 55 * 60_000;

/**
 * Schedule a work-break reminder (RB-22): invoke `cb` once after `delayMs` (default 55 min).
 * A client-side countdown primitive; persisting the authoritative break time
 * (`SesjaUzytkownika.ostatniaPrzerwa`) is handled later (step 4).
 *
 * @param cb - Callback fired when the break is due.
 * @param delayMs - Delay before firing, in milliseconds (default 55 minutes).
 * @returns A handle whose `cancel()` stops the pending reminder.
 */
export function startBreakTimer(
  cb: () => void,
  delayMs: number = DEFAULT_BREAK_MS,
): { cancel(): void } {
  const handle = setTimeout(cb, delayMs);
  return {
    cancel(): void {
      clearTimeout(handle);
    },
  };
}
