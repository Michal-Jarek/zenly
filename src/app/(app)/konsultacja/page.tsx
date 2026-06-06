import { requireUser } from "@/server/services/auth.service";
import { listPsychologistsForBooking } from "@/server/services/consultation.service";
import { Card } from "@/components/Card";
import { ConsultationBooking } from "@/components/consultation/ConsultationBooking";

export const dynamic = "force-dynamic";

export default async function KonsultacjaPage() {
  await requireUser();
  const psychologists = await listPsychologistsForBooking();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">Konsultacja</h1>

      <Card>
        <p className="font-medium">
          <span aria-hidden="true" className="mr-2">
            💬
          </span>
          Potrzebujesz wsparcia?
        </p>
        <p className="mt-3 text-neutral-700">
          Rozmowa z psychologiem może pomóc uporządkować myśli, zrozumieć emocje i znaleźć
          rozwiązania.
        </p>
        <p className="mt-3 text-neutral-700">
          Umów się na konsultację w dogodnym dla siebie czasie.
        </p>
      </Card>

      <ConsultationBooking psychologists={psychologists} />
    </div>
  );
}
