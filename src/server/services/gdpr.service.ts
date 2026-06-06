import type { PoziomStresu, Rola, TypPowiadomienia } from "@/server/domain/types";
import { NotFoundError } from "@/server/domain/errors";
import {
  findUserExportProfile,
  findUserLoginById,
  deleteUser,
} from "@/server/data/user.repository";
import { getResultsForExport } from "@/server/data/wynik.repository";
import { getVisitsForExport } from "@/server/data/wizyta.repository";
import { listByUser } from "@/server/data/powiadomienie.repository";
import { logDataExport, logAccountDeletion } from "@/server/services/security.service";

/** A user's personal data, assembled for the RODO export (plain JSON — no Prisma row types). */
export interface ExportDTO {
  profil: {
    imie: string;
    nazwisko: string;
    login: string;
    email: string;
    rola: Rola;
    createdAt: Date;
    updatedAt: Date;
  };
  wyniki: {
    sumaPunktow: number;
    poziomStresu: PoziomStresu;
    dataWypelnienia: Date;
    odpowiedzi: { pytanieId: string; wartosc: number }[];
  }[];
  wizyty: {
    status: "ZAREZERWOWANA" | "ODBYTA" | "ANULOWANA";
    linkDoSpotkania: string;
    createdAt: Date;
    termin: { poczatek: Date; koniec: Date };
    psycholog: { imie: string; nazwisko: string; specjalizacja: string };
  }[];
  powiadomienia: {
    typ: TypPowiadomienia;
    tresc: string;
    przeczytane: boolean;
    createdAt: Date;
  }[];
}

/**
 * Collect a user's own data for the RODO export: profile, survey results (with answers), visits and
 * notifications. Never includes the password hash or session tokens. Records a `RODO_EKSPORT` event.
 *
 * @param userId - The acting user (everything is scoped to this id).
 * @returns The user's personal data as a plain, downloadable object.
 * @throws {NotFoundError} When the user does not exist.
 */
export async function exportMyData(userId: string): Promise<ExportDTO> {
  const [profil, wyniki, wizyty, powiadomienia] = await Promise.all([
    findUserExportProfile(userId),
    getResultsForExport(userId),
    getVisitsForExport(userId),
    listByUser(userId),
  ]);
  if (!profil) {
    throw new NotFoundError("User not found.");
  }

  const dto: ExportDTO = {
    profil,
    wyniki,
    wizyty,
    powiadomienia: powiadomienia.map((p) => ({
      typ: p.typ,
      tresc: p.tresc,
      przeczytane: p.przeczytane,
      createdAt: p.createdAt,
    })),
  };

  await logDataExport({ userId, login: profil.login });
  return dto;
}

/**
 * Permanently delete a user's account (RODO right to erasure). Schema cascades remove the user's
 * results/visits/notifications/sessions; the audit trail survives (`SecurityEvent.userId` → null).
 * Records a `RODO_USUNIECIE` event by login. Session/cookie teardown is the caller's concern.
 *
 * @param userId - The acting user to delete.
 * @throws {NotFoundError} When the user does not exist.
 */
export async function deleteMyAccount(userId: string): Promise<void> {
  const user = await findUserLoginById(userId);
  if (!user) {
    throw new NotFoundError("User not found.");
  }
  await deleteUser(userId);
  await logAccountDeletion({ login: user.login });
}
