import { getModuleByType } from "@/server/services/modul.service";
import { ModuleScreen } from "@/components/modules/ModuleScreen";

export const dynamic = "force-dynamic";

export default async function MuzykaPage() {
  const modul = await getModuleByType("MUZYKA");
  return (
    <ModuleScreen
      title="Muzyka relaksacyjna"
      emoji="🎧"
      paragraphs={[
        "Zanurz się w dźwiękach.",
        "Odpowiednia muzyka pomaga się zrelaksować, obniżyć napięcie i poprawić koncentrację.",
        "Wybierz coś dla siebie i pozwól sobie na chwilę relaksu.",
      ]}
      zasoby={modul?.zasoby ?? []}
      singleLabel="Propozycje dla Ciebie"
    />
  );
}
