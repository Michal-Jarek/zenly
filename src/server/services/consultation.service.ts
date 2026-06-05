import { listPsychologowieWithFreeTerminy } from "@/server/data/psycholog.repository";
import { listFreeTerminy } from "@/server/data/termin.repository";
import { bookConsultation as bookConsultationRepo } from "@/server/data/wizyta.repository";

/**
 * List psychologists together with their free consultation slots.
 *
 * @returns Psychologists, each with a calendar of unoccupied slots.
 */
export function listPsychologowie() {
  return listPsychologowieWithFreeTerminy();
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
 * Book a consultation slot for a user (RB-17/18). The slot is claimed and the visit
 * created atomically in a single transaction (handled by the data layer).
 *
 * @param userId - The employee booking the consultation.
 * @param terminId - The slot to book.
 * @returns The created visit.
 * @throws {SlotAlreadyTakenError} When the slot was already taken.
 * @throws {NotFoundError} When the slot or its psychologist does not exist.
 */
export function bookConsultation(userId: string, terminId: string) {
  return bookConsultationRepo({ userId, terminId });
}
