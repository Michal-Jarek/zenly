import { requireUser } from "@/server/services/auth.service";
import { getActiveSurvey, getMyResults } from "@/server/services/survey.service";
import { SurveyModal } from "@/components/survey/SurveyModal";

export const dynamic = "force-dynamic";

export default async function AnkietaPage() {
  const session = await requireUser();
  const [survey, results] = await Promise.all([
    getActiveSurvey(),
    getMyResults(session.userId),
  ]);

  if (!survey) {
    return <p className="text-neutral-500">Brak aktywnej ankiety.</p>;
  }

  // First-ever survey for an employee is mandatory (RB-06) — the modal cannot be closed.
  const mandatory = session.rola === "EMPLOYEE" && results.length === 0;

  return (
    <SurveyModal ankietaId={survey.id} pytania={survey.pytania} mandatory={mandatory} />
  );
}
