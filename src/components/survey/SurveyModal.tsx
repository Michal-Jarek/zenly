"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { submitSurveyAction } from "@/server/actions/survey.actions";
import type { PoziomStresu, TypModulu } from "@/server/domain/types";
import { stressView } from "@/lib/stress-ui";
import { MODULE_NAV } from "@/lib/module-ui";
import { Modal, CloseButton } from "@/components/Modal";

type Pytanie = { id: string; tresc: string; kolejnosc: number };

type SurveyResult = {
  poziomStresu: PoziomStresu;
  sumaPunktow: number;
  recommendation: TypModulu[];
};

const SCALE = [
  "Nigdy",
  "Rzadko",
  "Czasami",
  "Często",
  "Bardzo często",
];

/**
 * Stress survey modal. When `mandatory` (first-ever survey, RB-06) the modal cannot be closed;
 * otherwise it is dismissable back to the dashboard. On success it shows the level + recommendation.
 */
export function SurveyModal({
  ankietaId,
  pytania,
  mandatory,
}: {
  ankietaId: string;
  pytania: Pytanie[];
  mandatory: boolean;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<number[]>(() =>
    Array(pytania.length).fill(0),
  );
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SurveyResult | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    router.push("/dashboard");
  }

  function finish() {
    router.push("/dashboard");
    router.refresh();
  }

  function submit() {
    if (answers.some((a) => a === 0)) {
      setError("Odpowiedz na wszystkie pytania.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await submitSurveyAction({ ankietaId, answers });
      if (res.ok) {
        setResult(res.data);
      } else {
        setError(res.error.message);
      }
    });
  }

  if (result) {
    const view = stressView(result.poziomStresu);
    return (
      <Modal labelledBy="survey-result-title" onClose={finish} panelClassName="relative">
        <CloseButton onClick={finish} />
        <div className="overflow-y-auto p-8">
          <h2 id="survey-result-title" className="text-2xl font-bold">
            Dziękujemy za wypełnienie ankiety!
          </h2>
          <p className="mt-4 text-lg">
            Twój poziom stresu:{" "}
            <span className={`font-semibold ${view.textClass}`}>{view.label}</span>
          </p>
          <h3 className="mt-6 text-lg font-semibold">Zalecenia dla Ciebie:</h3>
          <ul className="mt-3 flex flex-col gap-2">
            {result.recommendation.map((typ) => (
              <li key={typ}>
                <Link href={MODULE_NAV[typ].href} className="flex items-center gap-2 hover:underline">
                  <span aria-hidden="true">{MODULE_NAV[typ].emoji}</span>
                  {MODULE_NAV[typ].label}
                </Link>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={finish}
            className="mt-8 w-full rounded-xl bg-black px-4 py-3 font-semibold text-white"
          >
            Przejdź do panelu
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      labelledBy="survey-title"
      describedBy="survey-desc"
      onClose={mandatory ? undefined : close}
      panelClassName={mandatory ? "" : "relative"}
    >
      {!mandatory && <CloseButton onClick={close} />}
      <div className="p-8 pb-5">
        <h2 id="survey-title" className="text-2xl font-bold">
          Jak Twój dzisiejszy poziom stresu?
        </h2>
        <p id="survey-desc" className="mt-2 text-neutral-500">
          Odpowiedz na poniższe pytania, wybierając opcję, która najlepiej opisuje Twoje
          odczucia w ostatnim czasie.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <ol className="flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto border-t border-neutral-200 px-8 py-6">
          {pytania.map((pytanie, i) => (
            <li key={pytanie.id}>
              <fieldset>
                <legend className="font-semibold">
                  {i + 1}. {pytanie.tresc}
                </legend>
                <div className="mt-3 flex flex-col gap-2">
                  {SCALE.map((label, idx) => {
                    const value = idx + 1;
                    return (
                      <label key={value} className="flex items-center gap-3 text-sm">
                        <input
                          type="radio"
                          name={`q-${pytanie.id}`}
                          value={value}
                          checked={answers[i] === value}
                          onChange={() =>
                            setAnswers((prev) => {
                              const next = [...prev];
                              next[i] = value;
                              return next;
                            })
                          }
                          className="h-4 w-4"
                        />
                        {value} - {label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </li>
          ))}
        </ol>

        <div className="border-t border-neutral-200 p-8 pt-5">
          {error && (
            <p role="alert" className="mb-4 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-black px-4 py-3 font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Wysyłanie…" : "Wyślij ankietę"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
