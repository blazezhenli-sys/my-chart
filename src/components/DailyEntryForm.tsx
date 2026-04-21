"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/lib/client-api";
import {
  MOST_FERTILE_FREQUENCY_VALUES,
  MUCUS_SLIPPERINESS_VALUES,
  MUCUS_STRETCH_VALUES,
  MUCUS_TRANSPARENCY_VALUES,
  type MostFertileFrequency,
  type MucusSlipperiness,
  type MucusStretch,
  type MucusTransparency,
} from "@/types/contracts";
import type { CycleDayView } from "@/types/app";

type DailyEntryFormProps = {
  cycleId: string;
  initialDay?: CycleDayView;
  cycleStartDate?: string;
  cycleEndDate?: string | null;
};

type CalendarCell = {
  iso: string;
  dayOfMonth: number;
  inCurrentMonth: boolean;
};

function todayIso() {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function parseIsoDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfUtcMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addUtcDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function addUtcMonths(date: Date, months: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function monthLabel(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function buildCalendarGrid(monthStart: Date): CalendarCell[] {
  const firstWeekday = monthStart.getUTCDay();
  const gridStart = addUtcDays(monthStart, -firstWeekday);

  return Array.from({ length: 42 }, (_, idx) => {
    const day = addUtcDays(gridStart, idx);
    return {
      iso: toIsoDate(day),
      dayOfMonth: day.getUTCDate(),
      inCurrentMonth: day.getUTCMonth() === monthStart.getUTCMonth(),
    };
  });
}

function isWithinCycleRange(dateIso: string, cycleStartDate?: string, cycleEndDate?: string | null) {
  if (cycleStartDate && dateIso < cycleStartDate) {
    return false;
  }

  if (cycleEndDate && dateIso > cycleEndDate) {
    return false;
  }

  return true;
}

const BLEEDING_OPTIONS = [
  { value: 0, label: "None" },
  { value: 1, label: "VL" },
  { value: 2, label: "L" },
  { value: 3, label: "M" },
  { value: 4, label: "H" },
] as const;

function frequencyLabel(value: MostFertileFrequency) {
  switch (value) {
    case "ONE":
      return "1";
    case "TWO":
      return "2";
    case "THREE":
      return "3";
    case "AD":
      return "AD";
    default:
      return "None";
  }
}

function transparencyLabel(value: MucusTransparency) {
  if (value === "X") {
    return "Empty";
  }

  return value;
}

function slipperinessLabel(value: MucusSlipperiness) {
  if (value === "X") {
    return "Empty";
  }

  return value;
}

export function DailyEntryForm({ cycleId, initialDay, cycleStartDate, cycleEndDate }: DailyEntryFormProps) {
  const router = useRouter();

  const [date, setDate] = useState(initialDay?.date ?? todayIso());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfUtcMonth(parseIsoDate(initialDay?.date ?? todayIso())));

  const [mucusStretch, setMucusStretch] = useState<MucusStretch>(initialDay?.mucusStretch ?? 0);
  const [mucusTransparency, setMucusTransparency] = useState<MucusTransparency>(initialDay?.mucusTransparency ?? "X");
  const [mucusSlipperiness, setMucusSlipperiness] = useState<MucusSlipperiness>(initialDay?.mucusSlipperiness ?? "X");
  const [mostFertileFrequency, setMostFertileFrequency] = useState<MostFertileFrequency>(
    initialDay?.mostFertileFrequency ?? "NONE",
  );
  const [bleedingLevel, setBleedingLevel] = useState<number>(initialDay?.bleedingLevel ?? 0);
  const [intercourse, setIntercourse] = useState<boolean>(initialDay?.intercourse ?? false);
  const [notes, setNotes] = useState<string>(initialDay?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [clearing, setClearing] = useState(false);

  const calendarCells = useMemo(() => buildCalendarGrid(visibleMonth), [visibleMonth]);
  const suppressMucusScoring = bleedingLevel >= 3;
  const transparencyDisabled = mucusStretch === 2 || suppressMucusScoring;
  const frequencyDisabled = suppressMucusScoring;

  useEffect(() => {
    if (mucusStretch === 2 && mucusTransparency !== "X") {
      setMucusTransparency("X");
    }
  }, [mucusStretch, mucusTransparency]);

  useEffect(() => {
    if (!suppressMucusScoring) {
      return;
    }

    setMucusStretch(0);
    setMucusTransparency("X");
    setMucusSlipperiness("X");
    setMostFertileFrequency("NONE");
  }, [suppressMucusScoring]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!isWithinCycleRange(date, cycleStartDate, cycleEndDate)) {
      setError("Date is outside this cycle range.");
      return;
    }

    setPending(true);

    try {
      await apiFetch(`/api/cycles/${cycleId}/days/${date}`, {
        method: "PUT",
        body: JSON.stringify({
          bbtValue: null,
          bbtUnit: "C",
          mucusStretch: suppressMucusScoring ? 0 : mucusStretch,
          mucusTransparency: suppressMucusScoring || mucusStretch === 2 ? "X" : mucusTransparency,
          mucusSlipperiness: suppressMucusScoring ? "X" : mucusSlipperiness,
          mostFertileFrequency: suppressMucusScoring ? "NONE" : mostFertileFrequency,
          cervixPosition: "unknown",
          bleedingLevel,
          intercourse,
          notes,
        }),
      });

      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to save daily entry");
    } finally {
      setPending(false);
    }
  }

  function clearLocalInputs() {
    setMucusStretch(0);
    setMucusTransparency("X");
    setMucusSlipperiness("X");
    setMostFertileFrequency("NONE");
    setBleedingLevel(0);
    setIntercourse(false);
    setNotes("");
  }

  async function onClearDay() {
    setError(null);

    if (!isWithinCycleRange(date, cycleStartDate, cycleEndDate)) {
      setError("Date is outside this cycle range.");
      return;
    }

    setClearing(true);
    try {
      await apiFetch(`/api/cycles/${cycleId}/days/${date}`, {
        method: "DELETE",
      });
      clearLocalInputs();
      router.refresh();
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : "Failed to clear day");
    } finally {
      setClearing(false);
    }
  }

  function pickDate(iso: string) {
    setDate(iso);
    setVisibleMonth(startOfUtcMonth(parseIsoDate(iso)));
    setCalendarOpen(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-red-900/60 bg-zinc-950 p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="relative block text-sm">
          <span className="mb-1 block font-medium text-yellow-200">Date</span>
          <button
            type="button"
            onClick={() => setCalendarOpen((v) => !v)}
            className="w-full rounded-md border border-red-900/60 px-3 py-2 text-left hover:bg-red-950/30"
          >
            {date}
          </button>
          <input type="hidden" value={date} name="date" />

          {calendarOpen ? (
            <div className="absolute z-20 mt-2 w-full rounded-xl border border-red-900/60 bg-zinc-950 p-3 shadow-lg">
              <div className="mb-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setVisibleMonth((m) => addUtcMonths(m, -1))}
                  className="rounded border border-red-900/60 px-2 py-1 text-xs hover:bg-red-950/40"
                >
                  Prev
                </button>
                <p className="text-xs font-semibold text-yellow-200">{monthLabel(visibleMonth)}</p>
                <button
                  type="button"
                  onClick={() => setVisibleMonth((m) => addUtcMonths(m, 1))}
                  className="rounded border border-red-900/60 px-2 py-1 text-xs hover:bg-red-950/40"
                >
                  Next
                </button>
              </div>

              <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] uppercase text-yellow-400/70">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calendarCells.map((cell) => {
                  const isSelected = cell.iso === date;
                  const isToday = cell.iso === todayIso();
                  const inRange = isWithinCycleRange(cell.iso, cycleStartDate, cycleEndDate);

                  return (
                    <button
                      key={cell.iso}
                      type="button"
                      disabled={!inRange}
                      onClick={() => pickDate(cell.iso)}
                      className={[
                        "rounded px-1 py-1 text-center text-xs transition",
                        cell.inCurrentMonth ? "text-yellow-100" : "text-yellow-600/60",
                        isSelected ? "bg-red-700 font-semibold text-yellow-50" : inRange ? "hover:bg-red-950/40" : "",
                        isToday && !isSelected ? "ring-1 ring-yellow-500/70" : "",
                        inRange ? "" : "opacity-50",
                      ].join(" ")}
                    >
                      {cell.dayOfMonth}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-yellow-200">Mucus stretch</span>
          <select
            value={mucusStretch}
            onChange={(e) => setMucusStretch(Number(e.target.value) as MucusStretch)}
            className="w-full rounded-md border border-red-900/60 px-3 py-2"
          >
            {MUCUS_STRETCH_VALUES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-yellow-200">Transparency</span>
          <select
            value={mucusTransparency}
            onChange={(e) => setMucusTransparency(e.target.value as MucusTransparency)}
            disabled={transparencyDisabled}
            className="w-full rounded-md border border-red-900/60 px-3 py-2"
          >
            {MUCUS_TRANSPARENCY_VALUES.map((value) => (
              <option key={value} value={value}>
                {transparencyLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-yellow-200">Slipperiness</span>
          <select
            value={mucusSlipperiness}
            onChange={(e) => setMucusSlipperiness(e.target.value as MucusSlipperiness)}
            className="w-full rounded-md border border-red-900/60 px-3 py-2"
          >
            {MUCUS_SLIPPERINESS_VALUES.map((value) => (
              <option key={value} value={value}>
                {slipperinessLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-yellow-200">Most fertile frequency</span>
          <select
            value={mostFertileFrequency}
            onChange={(e) => setMostFertileFrequency(e.target.value as MostFertileFrequency)}
            disabled={frequencyDisabled}
            className="w-full rounded-md border border-red-900/60 px-3 py-2"
          >
            {MOST_FERTILE_FREQUENCY_VALUES.map((value) => (
              <option key={value} value={value}>
                {frequencyLabel(value)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-yellow-200">Bleeding level</span>
          <select
            value={bleedingLevel}
            onChange={(e) => setBleedingLevel(Number(e.target.value))}
            className="w-full rounded-md border border-red-900/60 px-3 py-2"
          >
            {BLEEDING_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-yellow-200">
          <input
            type="checkbox"
            checked={intercourse}
            onChange={(e) => setIntercourse(e.target.checked)}
            className="h-4 w-4"
          />
          Intercourse
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-yellow-200">Notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={1000}
          rows={3}
          className="w-full rounded-md border border-red-900/60 px-3 py-2"
        />
      </label>

      {error ? <p className="text-sm text-rose-500">{error}</p> : null}

      <button
        type="submit"
        disabled={pending || clearing}
        className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-yellow-50 hover:bg-red-600 disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save entry"}
      </button>

      <button
        type="button"
        onClick={onClearDay}
        disabled={pending || clearing}
        className="ml-2 rounded-md border border-red-700/70 px-4 py-2 text-sm font-semibold text-yellow-100 hover:bg-red-950/40 disabled:opacity-60"
      >
        {clearing ? "Clearing..." : "Clear day"}
      </button>
    </form>
  );
}
