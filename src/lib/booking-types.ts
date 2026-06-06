/** Booking DTOs — slot times are pre-formatted on the server (app timezone) so the client never
 *  recomputes wall-clock from raw instants (avoids server/client TZ divergence). */

export type BookingSlot = {
  id: string;
  epochMs: number; // for ordering only (instant, TZ-independent)
  year: number;
  monthIndex: number; // 0-based
  day: number;
  dayKey: string; // `${year}-${monthIndex}-${day}`
  timeLabel: string; // "17:00" (app timezone)
  dayLabel: string; // "Poniedziałek, 09.06"
  timeRange: string; // "17:00 - 17:55"
};

export type BookingPsychologist = {
  id: string;
  imie: string;
  nazwisko: string;
  specjalizacja: string;
  telefon: string;
  slots: BookingSlot[];
};
