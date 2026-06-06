import { getModuleByType } from "@/server/services/modul.service";
import { ModuleScreen } from "@/components/modules/ModuleScreen";

export const dynamic = "force-dynamic";

export default async function CwiczeniaPage() {
  const modul = await getModuleByType("CWICZENIA");
  return (
    <ModuleScreen
      title="Ćwiczenia fizyczne"
      emoji="🤸"
      paragraphs={[
        "Oderwij się na moment od pracy.",
        "Krótka aktywność fizyczna pomaga zmniejszyć napięcie, poprawia samopoczucie i dodaje energii.",
        "Poniżej znajdziesz proste ćwiczenia, które możesz wykonać w dowolnej chwili.",
      ]}
      zasoby={modul?.zasoby ?? []}
      shortLabel="Ćwiczenia 5-10 minut"
      longLabel="Ćwiczenia 15-30 minut"
    />
  );
}
