"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bookConsultationAction } from "@/server/actions/consultation.actions";
import type { BookingPsychologist, BookingSlot } from "@/lib/booking-types";
import { Card } from "@/components/Card";
import { Modal, CloseButton } from "@/components/Modal";
import { PsychologistPickerModal } from "@/components/consultation/PsychologistPickerModal";

const WEEKDAYS = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];
const MONTH_FMT = new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" });

// Visual base grid (business hours). The actual slot times are merged in, so a slot outside these
// hours is still bookable (no dead-end), while unavailable base times render greyed (mockup look).
const BASE_GRID: string[] = (() => {
  const out: string[] = [];
  for (let h = 9; h <= 16; h++) {
    out.push(`${String(h).padStart(2, "0")}:00`);
    out.push(`${String(h).padStart(2, "0")}:30`);
  }
  return out;
})();

export function ConsultationBooking({
  psychologists,
}: {
  psychologists: BookingPsychologist[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const firstWithSlots =
    psychologists.find((p) => p.slots.length > 0) ?? psychologists[0] ?? null;
  const firstSlot = firstWithSlots?.slots[0];

  const [psychologistId, setPsychologistId] = useState<string | null>(
    firstWithSlots?.id ?? null,
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState<{ year: number; monthIndex: number }>(() => {
    if (firstSlot) return { year: firstSlot.year, monthIndex: firstSlot.monthIndex };
    const now = new Date();
    return { year: now.getFullYear(), monthIndex: now.getMonth() };
  });
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(
    firstSlot?.dayKey ?? null,
  );
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [booked, setBooked] = useState<{ day: string; time: string } | null>(null);

  const selected = psychologists.find((p) => p.id === psychologistId) ?? null;

  // dayKey -> slots for the selected psychologist.
  const byDay = useMemo(() => {
    const map = new Map<string, BookingSlot[]>();
    for (const slot of selected?.slots ?? []) {
      const list = map.get(slot.dayKey);
      if (list) list.push(slot);
      else map.set(slot.dayKey, [slot]);
    }
    return map;
  }, [selected]);

  const slotsForDay = selectedDayKey ? byDay.get(selectedDayKey) ?? [] : [];
  const slotByTime = new Map(slotsForDay.map((s) => [s.timeLabel, s]));
  const gridTimes = Array.from(
    new Set([...BASE_GRID, ...slotsForDay.map((s) => s.timeLabel)]),
  ).sort();

  function pickPsychologist(id: string) {
    setPsychologistId(id);
    setPickerOpen(false);
    setSelectedSlotId(null);
    setError(null);
    const earliest = psychologists.find((p) => p.id === id)?.slots[0];
    if (earliest) {
      setViewMonth({ year: earliest.year, monthIndex: earliest.monthIndex });
      setSelectedDayKey(earliest.dayKey);
    } else {
      setSelectedDayKey(null);
    }
  }

  function book() {
    if (!selectedSlotId) return;
    const slot = selected?.slots.find((s) => s.id === selectedSlotId);
    setError(null);
    startTransition(async () => {
      const res = await bookConsultationAction({ terminId: selectedSlotId });
      if (res.ok && slot) {
        setBooked({ day: slot.dayLabel, time: slot.timeRange });
        setSelectedSlotId(null);
        router.refresh();
      } else if (!res.ok) {
        setError(res.error.message);
        router.refresh();
      }
    });
  }

  // --- calendar grid for the view month (Monday-first; pure calendar math, TZ-independent) ---
  const monthLabelRaw = MONTH_FMT.format(new Date(viewMonth.year, viewMonth.monthIndex, 1));
  const monthLabel = monthLabelRaw.charAt(0).toUpperCase() + monthLabelRaw.slice(1);
  const firstDow = (new Date(viewMonth.year, viewMonth.monthIndex, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(viewMonth.year, viewMonth.monthIndex + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function shiftMonth(delta: number) {
    setViewMonth((m) => {
      const d = new Date(m.year, m.monthIndex + delta, 1);
      return { year: d.getFullYear(), monthIndex: d.getMonth() };
    });
  }

  const selectedName = selected ? `${selected.imie} ${selected.nazwisko}` : "";

  return (
    <Card>
      <h2 className="font-medium text-neutral-700">Wybierz psychologa</h2>
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="mt-2 flex w-full items-center justify-between rounded-full border border-neutral-300 px-5 py-3 text-left"
      >
        <span className={selectedName ? "" : "text-neutral-400"}>
          {selectedName || "Szukaj"}
        </span>
        <SearchIcon />
      </button>

      <h2 className="mt-6 font-medium text-neutral-700">Wybierz datę oraz godzinę</h2>
      <div className="mt-3 grid gap-8 lg:grid-cols-2">
        {/* Calendar */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-lg font-bold">{monthLabel}</span>
            <span className="flex gap-2">
              <button
                type="button"
                aria-label="Poprzedni miesiąc"
                onClick={() => shiftMonth(-1)}
                className="rounded px-2 py-1 hover:bg-neutral-100"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Następny miesiąc"
                onClick={() => shiftMonth(1)}
                className="rounded px-2 py-1 hover:bg-neutral-100"
              >
                ›
              </button>
            </span>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-sm">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1 text-neutral-500">
                {w}
              </div>
            ))}
            {cells.map((day, i) => {
              if (day === null) return <div key={`e-${i}`} />;
              const key = `${viewMonth.year}-${viewMonth.monthIndex}-${day}`;
              const hasSlots = byDay.has(key);
              const isSelected = key === selectedDayKey;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={!hasSlots}
                  aria-pressed={isSelected}
                  onClick={() => {
                    setSelectedDayKey(key);
                    setSelectedSlotId(null);
                  }}
                  className={`aspect-square rounded-lg border text-sm ${
                    isSelected
                      ? "bg-black font-semibold text-white"
                      : hasSlots
                        ? "border-neutral-300 font-semibold hover:bg-neutral-100"
                        : "border-transparent text-neutral-300"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time slots */}
        <div>
          <div className="grid grid-cols-4 gap-3">
            {gridTimes.map((t) => {
              const slot = slotByTime.get(t);
              const available = Boolean(slot);
              const isSelected = slot?.id === selectedSlotId;
              return (
                <button
                  key={t}
                  type="button"
                  disabled={!available}
                  onClick={() => slot && setSelectedSlotId(slot.id)}
                  className={`rounded-full border px-3 py-2 text-sm ${
                    isSelected
                      ? "border-black bg-black text-white"
                      : available
                        ? "border-neutral-300 hover:border-neutral-900"
                        : "border-neutral-200 text-neutral-300"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>

          {error && (
            <p role="alert" className="mt-4 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="button"
            disabled={!selectedSlotId || pending}
            onClick={book}
            className="mt-6 w-full rounded-xl bg-black px-4 py-3 font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Rezerwowanie…" : "Umów konsultację"}
          </button>
        </div>
      </div>

      {pickerOpen && (
        <PsychologistPickerModal
          psychologists={psychologists}
          selectedId={psychologistId}
          onCancel={() => setPickerOpen(false)}
          onSelect={pickPsychologist}
        />
      )}

      {booked && (
        <Modal labelledBy="booked-title" onClose={() => setBooked(null)} panelClassName="relative">
          <CloseButton onClick={() => setBooked(null)} />
          <div className="overflow-y-auto p-8">
            <h2 id="booked-title" className="text-2xl font-bold">
              Konsultacja została umówiona!
            </h2>
            <p className="mt-3 text-neutral-500">
              Wszystkie niezbędne informacje (m.in. link do spotkania, kontakt) otrzymasz na
              adres mailowy.
            </p>
            <hr className="my-5 border-neutral-200" />
            <p className="text-xl font-semibold">
              <span aria-hidden="true">🕐</span> {booked.day}
              <br />
              {booked.time}
            </p>
          </div>
        </Modal>
      )}
    </Card>
  );
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}
