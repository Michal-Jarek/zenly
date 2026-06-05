import { prisma } from "@/server/data/db";

/** Survey with its questions ordered by `kolejnosc` (the positional answer mapping relies on this). */
export function getAnkietaWithPytania(ankietaId: string): Promise<{
  id: string;
  aktywna: boolean;
  pytania: { id: string; kolejnosc: number }[];
} | null> {
  return prisma.ankieta.findUnique({
    where: { id: ankietaId },
    select: {
      id: true,
      aktywna: true,
      pytania: {
        select: { id: true, kolejnosc: true },
        orderBy: { kolejnosc: "asc" },
      },
    },
  });
}
