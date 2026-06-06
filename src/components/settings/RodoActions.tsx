"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  exportMyDataAction,
  updateMyProfileAction,
  deleteMyAccountAction,
} from "@/server/actions/gdpr.actions";
import type { ActionError } from "@/lib/action-result";
import {
  updateProfileFormSchema,
  type UpdateProfileFormValues,
} from "@/lib/validation/profile";
import { Modal } from "@/components/Modal";

const FIELDS = [
  { name: "imie", label: "Imię", type: "text", autoComplete: "given-name" },
  { name: "nazwisko", label: "Nazwisko", type: "text", autoComplete: "family-name" },
  { name: "email", label: "E-mail", type: "email", autoComplete: "email" },
] as const;

/**
 * RODO self-service: rectify the profile (name/email), export personal data as JSON, or delete the
 * account. Each button is a thin trigger over a Server Action — all data access stays server-side.
 */
export function RodoActions({
  initialProfile,
}: {
  initialProfile: UpdateProfileFormValues;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(updateProfileFormSchema),
    defaultValues: initialProfile,
  });

  const [saveError, setSaveError] = useState<ActionError | null>(null);
  const [saved, setSaved] = useState(false);
  const [savePending, startSave] = useTransition();

  const [exportError, setExportError] = useState<string | null>(null);
  const [exportPending, startExport] = useTransition();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePending, startDelete] = useTransition();

  function onSave(values: UpdateProfileFormValues) {
    setSaveError(null);
    setSaved(false);
    startSave(async () => {
      const res = await updateMyProfileAction(values);
      if (res.ok) setSaved(true);
      else setSaveError(res.error);
    });
  }

  function exportData() {
    setExportError(null);
    startExport(async () => {
      const res = await exportMyDataAction();
      if (!res.ok) {
        setExportError(res.error.message);
        return;
      }
      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "zenly-moje-dane.json";
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function deleteAccount() {
    setDeleteError(null);
    startDelete(async () => {
      const res = await deleteMyAccountAction();
      // On success the action redirects to /login; only an error resolves here.
      if (!res.ok) setDeleteError(res.error.message);
    });
  }

  return (
    <div className="mt-4 flex flex-col gap-8">
      {/* Rectification — edit profile */}
      <form onSubmit={handleSubmit(onSave)} noValidate className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-neutral-700">Poprawienie danych</h3>
        {saveError && (
          <p role="alert" className="text-sm text-red-600">
            {saveError.message}
          </p>
        )}
        {saved && (
          <p role="status" className="text-sm text-green-600">
            Zapisano zmiany.
          </p>
        )}
        {FIELDS.map((f) => (
          <div key={f.name}>
            <label className="mb-1 block text-sm font-medium" htmlFor={f.name}>
              {f.label}
            </label>
            <input
              id={f.name}
              type={f.type}
              autoComplete={f.autoComplete}
              aria-invalid={Boolean(errors[f.name])}
              {...register(f.name)}
              className="w-full rounded-full border border-neutral-300 px-5 py-3"
            />
            {errors[f.name] && (
              <p className="mt-1 text-xs text-red-600">{errors[f.name]?.message}</p>
            )}
          </div>
        ))}
        <button
          type="submit"
          disabled={savePending}
          className="self-start rounded-xl bg-black px-6 py-3 font-semibold text-white disabled:opacity-50"
        >
          {savePending ? "Zapisywanie…" : "Zapisz"}
        </button>
      </form>

      {/* Access — export data */}
      <div className="border-t border-neutral-200 pt-6">
        <h3 className="text-sm font-semibold text-neutral-700">Eksport danych</h3>
        <p className="mt-1 text-sm text-neutral-500">
          Pobierz wszystkie swoje dane (profil, ankiety, konsultacje, powiadomienia) jako plik JSON.
        </p>
        {exportError && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {exportError}
          </p>
        )}
        <button
          type="button"
          onClick={exportData}
          disabled={exportPending}
          className="mt-3 rounded-xl border border-neutral-300 px-6 py-3 font-semibold disabled:opacity-50"
        >
          {exportPending ? "Przygotowywanie…" : "Eksportuj moje dane"}
        </button>
      </div>

      {/* Erasure — delete account */}
      <div className="border-t border-neutral-200 pt-6">
        <h3 className="text-sm font-semibold text-neutral-700">Usunięcie konta</h3>
        <p className="mt-1 text-sm text-neutral-500">
          Trwale usuwa konto i wszystkie powiązane dane. Tej operacji nie można cofnąć.
        </p>
        <button
          type="button"
          onClick={() => {
            setDeleteError(null);
            setConfirmOpen(true);
          }}
          className="mt-3 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white"
        >
          Usuń konto
        </button>
      </div>

      {confirmOpen && (
        <Modal
          labelledBy="delete-account-title"
          describedBy="delete-account-desc"
          onClose={deletePending ? undefined : () => setConfirmOpen(false)}
        >
          <div className="flex flex-col gap-4 p-8">
            <h2 id="delete-account-title" className="text-xl font-bold">
              Usunąć konto?
            </h2>
            <p id="delete-account-desc" className="text-neutral-600">
              Wszystkie Twoje dane (profil, ankiety, konsultacje, powiadomienia) zostaną trwale
              usunięte. Tej operacji nie można cofnąć.
            </p>
            {deleteError && (
              <p role="alert" className="text-sm text-red-600">
                {deleteError}
              </p>
            )}
            <div className="mt-2 flex justify-end gap-4">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={deletePending}
                className="rounded-xl border border-neutral-300 px-6 py-3 font-semibold disabled:opacity-50"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={deleteAccount}
                disabled={deletePending}
                className="rounded-xl bg-red-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
              >
                {deletePending ? "Usuwanie…" : "Usuń konto"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
