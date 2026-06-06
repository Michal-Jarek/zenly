import type { TypModulu } from "@/server/domain/types";
import { getModulyByTypy } from "@/server/data/modul.repository";

/** A content module with its resources, for a module page. */
export type ModuleView = {
  typ: TypModulu;
  tytul: string;
  opis: string;
  zasoby: {
    id: string;
    etykieta: string;
    url: string;
    pasmo: "SHORT_5_10" | "LONG_15_30";
  }[];
};

/**
 * Fetch a single content module (with resources) by type — only the four content types
 * (ODDECH/MEDYTACJA/MUZYKA/CWICZENIA); KONSULTACJA has no module and yields `null`.
 *
 * @param typ - The module type.
 * @returns The module with its resources, or `null` when none exists.
 */
export async function getModuleByType(typ: TypModulu): Promise<ModuleView | null> {
  const [modul] = await getModulyByTypy([typ]);
  if (!modul) return null;
  return {
    typ: modul.typ,
    tytul: modul.tytul,
    opis: modul.opis,
    zasoby: modul.zasoby.map((z) => ({
      id: z.id,
      etykieta: z.etykieta,
      url: z.url,
      pasmo: z.pasmo,
    })),
  };
}
