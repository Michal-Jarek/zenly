import { prisma } from "@/server/data/db";

/** Psychologists, each with their calendar of free (unoccupied) slots. */
export function listPsychologowieWithFreeTerminy() {
  return prisma.psycholog.findMany({
    orderBy: { nazwisko: "asc" },
    include: {
      kalendarz: {
        include: {
          terminy: {
            where: { zajety: false },
            orderBy: { poczatek: "asc" },
          },
        },
      },
    },
  });
}
