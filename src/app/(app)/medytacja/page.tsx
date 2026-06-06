import { getModuleByType } from "@/server/services/modul.service";
import { ModuleScreen } from "@/components/modules/ModuleScreen";

export const dynamic = "force-dynamic";

export default async function MedytacjaPage() {
  const modul = await getModuleByType("MEDYTACJA");
  return (
    <ModuleScreen
      title="Medytacja"
      emoji="🧘"
      paragraphs={[
        "Skieruj uwagę do wewnątrz.",
        "Kilka minut medytacji może pomóc uspokoić umysł i rozluźnić ciało.",
        "Wybierz nagranie i zacznij w swoim rytmie.",
      ]}
      zasoby={modul?.zasoby ?? []}
      shortLabel="Sesje 5-10 minut"
      longLabel="Sesje 15-30 minut"
    />
  );
}
