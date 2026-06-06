import { getModuleByType } from "@/server/services/modul.service";
import { ModuleScreen } from "@/components/modules/ModuleScreen";

export const dynamic = "force-dynamic";

export default async function OddechPage() {
  const modul = await getModuleByType("ODDECH");
  return (
    <ModuleScreen
      title="Oddech"
      emoji="🌿"
      paragraphs={[
        "Zatrzymaj się na chwilę.",
        "Twój oddech to najprostszy sposób, by obniżyć napięcie i odzyskać spokój — w dowolnym momencie dnia.",
        "Oto ćwiczenia oddechowe, które pomogą Ci się odprężyć.",
      ]}
      zasoby={modul?.zasoby ?? []}
      shortLabel="Sesje 5-10 minut"
      longLabel="Sesje 15-30 minut"
    />
  );
}
