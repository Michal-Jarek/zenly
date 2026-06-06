import { listPsychologowieWithFreeTerminy } from "@/server/data/psycholog.repository";
import { listFreeTerminy } from "@/server/data/termin.repository";
import {
  bookConsultation as bookConsultationRepo,
  listUpcomingByUser,
} from "@/server/data/wizyta.repository";
import { createNotification } from "@/server/services/notification.service";
import { warsawWallClock, formatConsultationWhen } from "@/lib/format";
import type { BookingPsychologist, BookingSlot } from "@/lib/booking-types";

/** A user's upcoming consultation, flattened for the presentation layer. */
export type UpcomingConsultation = {
  id: string;
  poczatek: Date;
  koniec: Date;
  psychologImie: string;
  psychologNazwisko: string;
  specjalizacja: string;
};

/**
 * List psychologists together with their free consultation slots.
 *
 * @returns Psychologists, each with a calendar of unoccupied slots.
 */
export function listPsychologowie() {
  return listPsychologowieWithFreeTerminy();
}

/**
 * List psychologists with free slots as a presentation DTO: each slot's wall-clock is computed
 * once on the server (app timezone), so the booking UI never derives times from raw instants
 * (no server/client TZ divergence, no Prisma shapes in the page).
 *
 * @returns Psychologists, each with their free slots pre-formatted for booking.
 */
export async function listPsychologistsForBooking(): Promise<BookingPsychologist[]> {
  const rows = await listPsychologowieWithFreeTerminy();
  return rows.map((p) => ({
    id: p.id,
    imie: p.imie,
    nazwisko: p.nazwisko,
    specjalizacja: p.specjalizacja,
    telefon: p.telefon,
    slots: (p.kalendarz?.terminy ?? [])
      .map((t): BookingSlot => {
        const wc = warsawWallClock(t.poczatek);
        const when = formatConsultationWhen(t.poczatek, t.koniec);
        return {
          id: t.id,
          epochMs: t.poczatek.getTime(),
          year: wc.year,
          monthIndex: wc.monthIndex,
          day: wc.day,
          dayKey: `${wc.year}-${wc.monthIndex}-${wc.day}`,
          timeLabel: wc.timeLabel,
          dayLabel: when.day,
          timeRange: when.time,
        };
      })
      .sort((a, b) => a.epochMs - b.epochMs),
  }));
}

/**
 * List every free consultation slot across all psychologists, earliest first
 * (a flat view for "soonest availability").
 *
 * @returns Unoccupied slots ordered by start time.
 */
export function listAvailableSlots() {
  return listFreeTerminy();
}

/**
 * Book a consultation slot for a user (RB-17/18). The slot is claimed and the visit created
 * atomically in a single transaction (data layer). On success this service also files the in-app
 * confirmation notification (RB-24) — orchestration belongs to the logic layer, not the action.
 *
 * @param userId - The employee booking the consultation.
 * @param terminId - The slot to book.
 * @returns The created visit.
 * @throws {SlotAlreadyTakenError} When the slot was already taken.
 * @throws {NotFoundError} When the slot or its psychologist does not exist.
 */
export async function bookConsultation(userId: string, terminId: string) {
  const wizyta = await bookConsultationRepo({ userId, terminId });
  // Best-effort, outside the booking transaction: the booking is authoritative, the notice is not.
  await createNotification(
    userId,
    "KONSULTACJA_POTWIERDZENIE",
    "Konsultacja została umówiona. Szczegóły otrzymasz na adres e-mail.",
  );
  return wizyta;
}

/**
 * List a user's upcoming reserved consultations (slot start in the future), earliest first.
 *
 * @param userId - The user whose consultations to list.
 * @returns Upcoming consultations with slot times and psychologist details.
 */
export async function getMyUpcomingConsultations(
  userId: string,
): Promise<UpcomingConsultation[]> {
  const rows = await listUpcomingByUser(userId, new Date());
  return rows.map((w) => ({
    id: w.id,
    poczatek: w.termin.poczatek,
    koniec: w.termin.koniec,
    psychologImie: w.psycholog.imie,
    psychologNazwisko: w.psycholog.nazwisko,
    specjalizacja: w.psycholog.specjalizacja,
  }));
}
