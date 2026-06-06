import { requireUser } from "@/server/services/auth.service";
import { getMyProfile } from "@/server/services/user.service";
import { Card } from "@/components/Card";
import { LogoutButton } from "@/components/auth/LogoutButton";

export const dynamic = "force-dynamic";

export default async function UstawieniaPage() {
  const { userId } = await requireUser();
  const profile = await getMyProfile(userId);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-3xl font-bold">Ustawienia</h1>

      <Card>
        <h2 className="text-lg font-semibold">Konto</h2>
        <p className="mt-2 text-neutral-700">
          {profile.imie} {profile.nazwisko}
        </p>
        <div className="mt-4">
          <LogoutButton />
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">Twoje dane (RODO)</h2>
        <p className="mt-2 text-sm text-neutral-500">
          Eksport oraz usunięcie danych będą dostępne wkrótce.
        </p>
      </Card>
    </div>
  );
}
