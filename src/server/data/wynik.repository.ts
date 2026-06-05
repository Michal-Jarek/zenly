import { prisma } from "@/server/data/db";
import type { $Enums, WynikAnkiety } from "@prisma/client";

/** Persist a survey result together with its answers in one (implicit) transaction. */
export function createWynikWithOdpowiedzi(input: {
  userId: string;
  ankietaId: string;
  sumaPunktow: number;
  poziomStresu: $Enums.PoziomStresu;
  odpowiedzi: { pytanieId: string; wartosc: number }[];
}): Promise<WynikAnkiety> {
  return prisma.wynikAnkiety.create({
    data: {
      userId: input.userId,
      ankietaId: input.ankietaId,
      sumaPunktow: input.sumaPunktow,
      poziomStresu: input.poziomStresu,
      odpowiedzi: { create: input.odpowiedzi },
    },
  });
}

/** All survey results for a user, newest first. */
export function getResultsByUser(userId: string): Promise<WynikAnkiety[]> {
  return prisma.wynikAnkiety.findMany({
    where: { userId },
    orderBy: { dataWypelnienia: "desc" },
  });
}

/** A single survey result by id, or `null`. */
export function getResultById(id: string): Promise<WynikAnkiety | null> {
  return prisma.wynikAnkiety.findUnique({ where: { id } });
}

/** Date of a user's most recent survey, or `null` when they have none. */
export function getLatestResultByUser(
  userId: string,
): Promise<{ dataWypelnienia: Date } | null> {
  return prisma.wynikAnkiety.findFirst({
    where: { userId },
    orderBy: { dataWypelnienia: "desc" },
    select: { dataWypelnienia: true },
  });
}
