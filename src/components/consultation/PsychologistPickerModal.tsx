"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";

export type PsychologistInfo = {
  id: string;
  imie: string;
  nazwisko: string;
  specjalizacja: string;
  telefon: string;
};

/** Modal to choose a psychologist (RB: 4 seeded, with specialization + phone). */
export function PsychologistPickerModal({
  psychologists,
  selectedId,
  onCancel,
  onSelect,
}: {
  psychologists: PsychologistInfo[];
  selectedId: string | null;
  onCancel: () => void;
  onSelect: (id: string) => void;
}) {
  const [temp, setTemp] = useState<string | null>(selectedId);

  return (
    <Modal labelledBy="psy-picker-title" onClose={onCancel}>
      <h2 id="psy-picker-title" className="sr-only">
        Wybierz psychologa
      </h2>
      <ul className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-8">
        {psychologists.map((p) => {
          const active = temp === p.id;
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setTemp(p.id)}
                aria-pressed={active}
                className={`w-full rounded-2xl border-2 p-4 text-left ${
                  active ? "border-neutral-900" : "border-neutral-200 hover:border-neutral-400"
                }`}
              >
                <p className="text-lg font-semibold">
                  {p.imie} {p.nazwisko}
                </p>
                <p className="text-sm text-neutral-500">{p.specjalizacja}</p>
                <p className="text-sm text-neutral-500">nr tel. {p.telefon}</p>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex justify-center gap-4 border-t border-neutral-200 p-6">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-neutral-300 px-8 py-2.5 font-medium"
        >
          Anuluj
        </button>
        <button
          type="button"
          disabled={!temp}
          onClick={() => temp && onSelect(temp)}
          className="rounded-xl bg-black px-8 py-2.5 font-semibold text-white disabled:opacity-50"
        >
          Wybierz
        </button>
      </div>
    </Modal>
  );
}
