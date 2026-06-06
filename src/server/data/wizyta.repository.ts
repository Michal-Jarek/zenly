import { prisma } from "@/server/data/db";
import type { $Enums, Wizyta } from "@prisma/client";
import { NotFoundError, SlotAlreadyTakenError } from "@/server/domain/errors";

/**
 * Book a consultation slot atomically: claim the slot, then create the visit, inside one
 * transaction. The claim is a compare-and-set (`updateMany where zajety:false`) so two
 * concurrent bookings cannot both succeed (no read-then-write race).
 *
 * @throws {SlotAlreadyTakenError} When the slot was already taken.
 * @throws {NotFoundError} When the slot (or its psychologist) does not exist.
 */
/** A user's upcoming reserved consultations (slot in the future), earliest first, with slot + psychologist. */
export function listUpcomingByUser(userId: string, now: Date) {
  return prisma.wizyta.findMany({
    where: { userId, status: "ZAREZERWOWANA", termin: { poczatek: { gte: now } } },
    include: { termin: true, psycholog: true },
    orderBy: { termin: { poczatek: "asc" } },
  });
}

/** All of a user's consultations for the RODO export (explicit safe select; their own booking data). */
export function getVisitsForExport(userId: string): Promise<
  {
    status: $Enums.StatusWizyty;
    linkDoSpotkania: string;
    createdAt: Date;
    termin: { poczatek: Date; koniec: Date };
    psycholog: { imie: string; nazwisko: string; specjalizacja: string };
  }[]
> {
  return prisma.wizyta.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      status: true,
      linkDoSpotkania: true,
      createdAt: true,
      termin: { select: { poczatek: true, koniec: true } },
      psycholog: { select: { imie: true, nazwisko: true, specjalizacja: true } },
    },
  });
}

export function bookConsultation(input: {
  userId: string;
  terminId: string;
}): Promise<Wizyta> {
  return prisma.$transaction(async (tx) => {
    // Atomic claim: flip false -> true; count 0 means the slot was already taken.
    const claim = await tx.termin.updateMany({
      where: { id: input.terminId, zajety: false },
      data: { zajety: true },
    });
    if (claim.count === 0) {
      throw new SlotAlreadyTakenError();
    }

    const termin = await tx.termin.findUnique({
      where: { id: input.terminId },
      include: { kalendarz: { include: { psycholog: true } } },
    });
    if (!termin) {
      throw new NotFoundError("Consultation slot not found.");
    }

    const psycholog = termin.kalendarz.psycholog;
    return tx.wizyta.create({
      data: {
        userId: input.userId,
        psychologId: psycholog.id,
        terminId: input.terminId,
        linkDoSpotkania: psycholog.linkDoSpotkania,
      },
    });
  });
}
