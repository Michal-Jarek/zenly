import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { startBreakTimer } from "@/server/domain/break-timer";

const MINUTE = 60_000;

describe("startBreakTimer (RB-22)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not fire before 55 minutes", () => {
    const cb = vi.fn();
    startBreakTimer(cb);
    vi.advanceTimersByTime(54 * MINUTE);
    expect(cb).not.toHaveBeenCalled();
  });

  it("fires once at 55 minutes", () => {
    const cb = vi.fn();
    startBreakTimer(cb);
    vi.advanceTimersByTime(55 * MINUTE);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("does not fire after cancel()", () => {
    const cb = vi.fn();
    const timer = startBreakTimer(cb);
    timer.cancel();
    vi.advanceTimersByTime(55 * MINUTE);
    expect(cb).not.toHaveBeenCalled();
  });
});
