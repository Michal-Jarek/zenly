import { prisma } from "@/server/data/db";

/** The active survey with its questions (incl. text), ordered by `kolejnosc`, newest first. */
export function getActiveAnkietaWithPytania(): Promise<{
  id: string;
  tytul: string;
  pytania: { id: string; tresc: string; kolejnosc: number }[];
} | null> {
  return prisma.ankieta.findFirst({
    where: { aktywna: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      tytul: true,
      pytania: {
        select: { id: true, tresc: true, kolejnosc: true },
        orderBy: { kolejnosc: "asc" },
      },
    },
  });
}

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
