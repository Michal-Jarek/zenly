/** Polish formatting helpers for consultation slots — pinned to a fixed app timezone so the
 *  output is identical on the server (container TZ may be UTC) and the client (browser TZ). */

const TZ = "Europe/Warsaw";

const TIME = new Intl.DateTimeFormat("pl-PL", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TZ,
});
const WEEKDAY = new Intl.DateTimeFormat("pl-PL", { weekday: "long", timeZone: TZ });
const DAY_MONTH = new Intl.DateTimeFormat("pl-PL", {
  day: "2-digit",
  month: "2-digit",
  timeZone: TZ,
});
// Stable wall-clock parts (YYYY-MM-DD HH:mm) in the app timezone.
const PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** "Czwartek, 18.05" + "14:00 - 14:30" for a slot (app timezone). */
export function formatConsultationWhen(
  start: Date,
  end: Date,
): { day: string; time: string } {
  const weekday = WEEKDAY.format(start);
  const cap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return {
    day: `${cap}, ${DAY_MONTH.format(start)}`,
    time: `${TIME.format(start)} - ${TIME.format(end)}`,
  };
}

/** "HH:MM" for a single instant (app timezone). */
export function formatTime(d: Date): string {
  return TIME.format(d);
}

/** Wall-clock calendar components of an instant in the app timezone (TZ-stable). */
export function warsawWallClock(d: Date): {
  year: number;
  monthIndex: number;
  day: number;
  timeLabel: string;
} {
  const parts = Object.fromEntries(
    PARTS.formatToParts(d)
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value]),
  );
  return {
    year: Number(parts.year),
    monthIndex: Number(parts.month) - 1,
    day: Number(parts.day),
    timeLabel: `${parts.hour}:${parts.minute}`,
  };
}
