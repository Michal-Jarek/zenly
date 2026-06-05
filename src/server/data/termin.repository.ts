import { prisma } from "@/server/data/db";
import type { Termin } from "@prisma/client";

/** All free (unoccupied) slots across every psychologist, earliest first. */
export function listFreeTerminy(): Promise<Termin[]> {
  return prisma.termin.findMany({
    where: { zajety: false },
    orderBy: { poczatek: "asc" },
  });
}
