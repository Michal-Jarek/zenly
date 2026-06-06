import Link from "next/link";
import { requireUser } from "@/server/services/auth.service";
import { getMyProfile } from "@/server/services/user.service";
import { getMyResults, isSurveyDue } from "@/server/services/survey.service";
import { getRecommendationForLevel } from "@/server/services/recommendation.service";
import { getMyUpcomingConsultations } from "@/server/services/consultation.service";
import { listNotifications } from "@/server/services/notification.service";
import { deriveTrend } from "@/lib/stress-ui";
import { Card } from "@/components/Card";
import { StressLevelCard } from "@/components/dashboard/StressLevelCard";
import { TrendCard } from "@/components/dashboard/TrendCard";
import { RecommendationsCard } from "@/components/dashboard/RecommendationsCard";
import { UpcomingConsultationsCard } from "@/components/dashboard/UpcomingConsultationsCard";
import { BreakTimerCard } from "@/components/dashboard/BreakTimerCard";
import { NotificationsCard } from "@/components/dashboard/NotificationsCard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { userId } = await requireUser();
  const [profile, results, due, upcoming, notifications] = await Promise.all([
    getMyProfile(userId),
    getMyResults(userId),
    isSurveyDue(userId, new Date()),
    getMyUpcomingConsultations(userId),
    listNotifications(userId),
  ]);

  const levels = results.map((r) => r.poziomStresu);
  const latest = levels[0] ?? null;
  const trend = deriveTrend(levels);
  const rec = latest ? await getRecommendationForLevel(latest) : null;
  const unread = notifications
    .filter((n) => !n.przeczytane)
    .map((n) => ({ id: n.id, tresc: n.tresc }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">Cześć {profile.imie}!</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Column 1 — stress status + survey CTA */}
        <div className="flex flex-col gap-6">
          {trend && <TrendCard trend={trend} />}
          {latest && <StressLevelCard level={latest} />}
          <Card>
            <p className="text-xl font-semibold">
              Pamiętaj o regularnym wypełnianiu ankiety w celu monitorowania poziomu stresu
            </p>
            {due && (
              <p className="mt-2 text-sm text-neutral-500">
                Możesz teraz wypełnić nową ankietę.
              </p>
            )}
            <Link
              href="/ankieta"
              className="mt-4 inline-block rounded-xl bg-black px-6 py-3 font-semibold text-white"
            >
              Wypełnij ankietę
            </Link>
          </Card>
        </div>

        {/* Column 2 — consultations, recommendations, notifications */}
        <div className="flex flex-col gap-6">
          <UpcomingConsultationsCard items={upcoming} />
          {rec && <RecommendationsCard typy={rec.typy} />}
          <NotificationsCard items={unread} />
        </div>

        {/* Column 3 — break reminder */}
        <div className="flex flex-col gap-6">
          <BreakTimerCard />
        </div>
      </div>
    </div>
  );
}
