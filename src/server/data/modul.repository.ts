import { prisma } from "@/server/data/db";
import type { $Enums } from "@prisma/client";

/**
 * Content modules of the given types, each with its resources.
 * `KONSULTACJA` has no content module, so it simply yields no row.
 */
export function getModulyByTypy(typy: $Enums.TypModulu[]) {
  return prisma.modul.findMany({
    where: { typ: { in: typy } },
    include: { zasoby: true },
  });
}
