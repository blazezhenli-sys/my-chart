"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/lib/client-api";
import type { CycleDayView, CycleView } from "@/types/app";
import type {
  MostFertileFrequency,
  MucusSlipperiness,
  MucusStretch,
  MucusTransparency,
} from "@/types/contracts";
import {
  MOST_FERTILE_FREQUENCY_VALUES,
  MUCUS_SLIPPERINESS_VALUES,
  MUCUS_STRETCH_VALUES,
  MUCUS_TRANSPARENCY_VALUES,
} from "@/types/contracts";

type ChartViewProps = {
  cycle: CycleView;
};

type CalendarCell = {
  iso: string;
  dayOfMonth: number;
  inCurrentMonth: boolean;
};

type EntryTone = {
  label: string;
  swatchClass: string;
  cellClass: string;
};

type EditorState = {
  mucusStretch: MucusStretch;
  mucusTransparency: MucusTransparency;
  mucusSlipperiness: MucusSlipperiness;
  mostFertileFrequency: MostFertileFrequency;
  bleedingLevel: number;
  intercourse: boolean;
  notes: string;
};

type TrackRow = {
  label: string;
  valueForDay: (day: CycleDayView) => string;
};

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

function isWithinCycleRange(dateIso: string, cycle: Pick<CycleView, "startDate" | "endDate">) {
  if (dateIso < cycle.startDate) {
    return false;
  }

  if (cycle.endDate && dateIso > cycle.endDate) {
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

function bloodLevelLabel(level: number) {
  const item = BLEEDING_OPTIONS.find((option) => option.value === level);
  return item ? item.label : String(level);
}

function hasSuppressedMucusScoring(day: Pick<CycleDayView, "bleedingLevel">) {
  return day.bleedingLevel >= 3;
}

function isPeakType(day: CycleDayView) {
  const transparencyIsPeak = day.mucusStretch >= 6 && day.mucusTransparency === "K";
  return day.mucusStretch === 10 || transparencyIsPeak || day.mucusSlipperiness === "L";
}

function mucusCode(
  day: Pick<CycleDayView, "mucusStretch" | "mucusTransparency" | "mucusSlipperiness" | "bleedingLevel">,
) {
  if (hasSuppressedMucusScoring(day)) {
    return "-";
  }

  const transparency = day.mucusStretch >= 6 && day.mucusTransparency !== "X" ? day.mucusTransparency : "";
  const lFlag = day.mucusSlipperiness === "L" ? "L" : "";
  return `${day.mucusStretch}${transparency}${lFlag}`;
}

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
      return "";
  }
}

function transparencyLabel(value: MucusTransparency) {
  return value === "X" ? "Empty" : value;
}

function slipperinessLabel(value: MucusSlipperiness) {
  return value === "X" ? "Empty" : value;
}

function computePeakDaySet(days: CycleDayView[]) {
  const set = new Set<string>();

  for (let i = 0; i < days.length; i += 1) {
    const current = days[i];
    if (!isPeakType(current)) {
      continue;
    }

    const next = days[i + 1];
    if (!next || !isPeakType(next)) {
      set.add(current.date);
    }
  }

  return set;
}

function entryTone(day: CycleDayView): EntryTone {
  if (day.bleedingLevel > 0) {
    return { label: "Blood", swatchClass: "bg-red-600", cellClass: "bg-red-600 text-yellow-50" };
  }

  if (isPeakType(day)) {
    return { label: "Peak type", swatchClass: "bg-zinc-100", cellClass: "bg-zinc-100 text-zinc-900" };
  }

  if (day.mucusStretch === 0) {
    return { label: "Dry", swatchClass: "bg-green-600", cellClass: "bg-green-600 text-yellow-50" };
  }

  return { label: "Non-peak type", swatchClass: "bg-yellow-400", cellClass: "bg-yellow-400 text-zinc-900" };
}

function annotationForDay(day: CycleDayView | undefined, dateIso: string, peakDays: string[]) {
  const latestPeak = [...peakDays].reverse().find((peakDate) => peakDate <= dateIso);

  let topRight = "";
  if (latestPeak) {
    if (dateIso === latestPeak) {
      topRight = "P";
    } else if (dateIso > latestPeak) {
      const diff = Math.floor((parseIsoDate(dateIso).getTime() - parseIsoDate(latestPeak).getTime()) / (24 * 60 * 60 * 1000));
      if (diff > 0) {
        topRight = `P+${diff}`;
      }
    }
  }

  if (!day) {
    return { topRight, topLeft: "", bottom: "" };
  }

  if (hasSuppressedMucusScoring(day)) {
    return {
      topRight,
      topLeft: day.intercourse ? "I" : "",
      bottom: bloodLevelLabel(day.bleedingLevel),
    };
  }

  const parts: string[] = [];
  if (day.bleedingLevel > 0) {
    parts.push(bloodLevelLabel(day.bleedingLevel));
  }

  parts.push(mucusCode(day));
  const frequency = frequencyLabel(day.mostFertileFrequency);
  if (frequency) {
    parts.push(frequency);
  }

  return {
    topRight,
    topLeft: day.intercourse ? "I" : "",
    bottom: parts.join(" "),
  };
}

function initEditorState(selected: CycleDayView | undefined): EditorState {
  return {
    mucusStretch: selected?.mucusStretch ?? 0,
    mucusTransparency: selected?.mucusTransparency ?? "X",
    mucusSlipperiness: selected?.mucusSlipperiness ?? "X",
    mostFertileFrequency: selected?.mostFertileFrequency ?? "NONE",
    bleedingLevel: selected?.bleedingLevel ?? 0,
    intercourse: selected?.intercourse ?? false,
    notes: selected?.notes ?? "",
  };
}

const trackRows: TrackRow[] = [
  {
    label: "Mucus Code",
    valueForDay: (day) => mucusCode(day) || "-",
  },
  {
    label: "Peak Type",
    valueForDay: (day) => (hasSuppressedMucusScoring(day) ? "-" : isPeakType(day) ? "Yes" : "No"),
  },
  {
    label: "Frequency",
    valueForDay: (day) => (hasSuppressedMucusScoring(day) ? "-" : frequencyLabel(day.mostFertileFrequency) || "-"),
  },
  {
    label: "Bleed",
    valueForDay: (day) => bloodLevelLabel(day.bleedingLevel),
  },
  {
    label: "Intercourse",
    valueForDay: (day) => (day.intercourse ? "Y" : "-"),
  },
];

export function ChartView({ cycle }: ChartViewProps) {
  const router = useRouter();
  const days = [...cycle.days].sort((a, b) => a.date.localeCompare(b.date));
  const byDate = useMemo(() => new Map(days.map((day) => [day.date, day])), [days]);

  const initialDateIso = days.at(-1)?.date ?? cycle.startDate;
  const initialMonth = startOfUtcMonth(parseIsoDate(initialDateIso));

  const [visibleMonth, setVisibleMonth] = useState(initialMonth);
  const [selectedDate, setSelectedDate] = useState(initialDateIso);
  const [editor, setEditor] = useState<EditorState>(initEditorState(byDate.get(initialDateIso)));
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const suppressMucusScoring = editor.bleedingLevel >= 3;
  const transparencyDisabled = editor.mucusStretch === 2 || suppressMucusScoring;
  const frequencyDisabled = suppressMucusScoring;

  const calendarCells = useMemo(() => buildCalendarGrid(visibleMonth), [visibleMonth]);
  const peakDaySet = useMemo(() => computePeakDaySet(days), [days]);
  const peakDaysSorted = useMemo(() => Array.from(peakDaySet).sort(), [peakDaySet]);

  function selectDate(iso: string) {
    if (!isWithinCycleRange(iso, cycle)) {
      return;
    }

    setSelectedDate(iso);
    setEditor(initEditorState(byDate.get(iso)));
    setMessage(null);
  }

  useEffect(() => {
    if (editor.mucusStretch === 2 && editor.mucusTransparency !== "X") {
      setEditor((prev) => ({ ...prev, mucusTransparency: "X" }));
    }
  }, [editor.mucusStretch, editor.mucusTransparency]);

  useEffect(() => {
    if (!suppressMucusScoring) {
      return;
    }

    setEditor((prev) => ({
      ...prev,
      mucusStretch: 0,
      mucusTransparency: "X",
      mucusSlipperiness: "X",
      mostFertileFrequency: "NONE",
    }));
  }, [suppressMucusScoring]);

  async function saveSelectedDate() {
    if (!isWithinCycleRange(selectedDate, cycle)) {
      setMessage("Selected date is outside this cycle range.");
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      await apiFetch(`/api/cycles/${cycle.id}/days/${selectedDate}`, {
        method: "PUT",
        body: JSON.stringify({
          bbtValue: null,
          bbtUnit: "C",
          mucusStretch: suppressMucusScoring ? 0 : editor.mucusStretch,
          mucusTransparency:
            suppressMucusScoring || editor.mucusStretch === 2 ? "X" : editor.mucusTransparency,
          mucusSlipperiness: suppressMucusScoring ? "X" : editor.mucusSlipperiness,
          mostFertileFrequency: suppressMucusScoring ? "NONE" : editor.mostFertileFrequency,
          cervixPosition: "unknown",
          bleedingLevel: editor.bleedingLevel,
          intercourse: editor.intercourse,
          notes: editor.notes,
        }),
      });

      setMessage(`Saved ${selectedDate}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function clearSelectedDate() {
    if (!isWithinCycleRange(selectedDate, cycle)) {
      setMessage("Selected date is outside this cycle range.");
      return;
    }

    setClearing(true);
    setMessage(null);

    try {
      await apiFetch(`/api/cycles/${cycle.id}/days/${selectedDate}`, {
        method: "DELETE",
      });
      setMessage(`Cleared ${selectedDate}`);
      setEditor(initEditorState(undefined));
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to clear day");
    } finally {
      setClearing(false);
    }
  }

  const legend: EntryTone[] = [
    { label: "Blood", swatchClass: "bg-red-600", cellClass: "" },
    { label: "Dry (0)", swatchClass: "bg-green-600", cellClass: "" },
    { label: "Non-peak (2/6/8)", swatchClass: "bg-yellow-400", cellClass: "" },
    { label: "Peak type (10 or K or L)", swatchClass: "bg-zinc-100", cellClass: "" },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-red-900/60 bg-zinc-950 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-yellow-100">Creighton Calendar (Entry-Driven)</h2>
          <div className="flex items-center gap-2">
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
            const entry = byDate.get(cell.iso);
            const tone = entry ? entryTone(entry) : null;
            const selected = selectedDate === cell.iso;
            const annotation = annotationForDay(entry, cell.iso, peakDaysSorted);
            const inRange = isWithinCycleRange(cell.iso, cycle);

            return (
              <button
                key={cell.iso}
                type="button"
                disabled={!inRange}
                onClick={() => selectDate(cell.iso)}
                className={[
                  "min-h-16 rounded border px-1 py-1 text-left text-xs transition",
                  cell.inCurrentMonth ? "border-red-900/40" : "border-zinc-800",
                  tone ? tone.cellClass : "bg-zinc-900 text-zinc-500",
                  selected ? "ring-2 ring-yellow-400" : inRange ? "hover:ring-1 hover:ring-red-700/70" : "",
                  inRange ? "" : "opacity-50",
                ].join(" ")}
              >
                <span className="flex items-start justify-between">
                  <span className="text-[10px] font-semibold">
                    {annotation.topLeft ? <span className="mr-1 rounded border border-yellow-500/70 px-1">{annotation.topLeft}</span> : null}
                    {cell.dayOfMonth}
                  </span>
                  <span className="text-[10px] font-bold">
                    {annotation.topRight ? (
                      <span className="rounded border border-yellow-500/70 px-1 text-[9px]">{annotation.topRight}</span>
                    ) : null}
                  </span>
                </span>
                <span className="mt-1 block text-[9px] leading-tight">{annotation.bottom}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-yellow-300/80">
          {legend.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1">
              <span className={`inline-block h-3 w-3 rounded ${item.swatchClass}`} />
              {item.label}
            </span>
          ))}
          <span className="inline-flex items-center gap-1">
            <span className="inline-block rounded border border-yellow-400 px-1 text-[10px] font-bold text-yellow-300">P</span>
            Peak day
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block rounded border border-yellow-400 px-1 text-[10px] font-bold text-yellow-300">P+1..n</span>
            Post-peak day
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block rounded border border-yellow-400 px-1 text-[10px] font-bold text-yellow-300">I</span>
            Intercourse day
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-red-900/60 bg-zinc-950 p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-yellow-100">Edit Selected Date: {selectedDate}</h2>
        <p className="mb-3 text-xs text-yellow-300/80">Click any calendar day above, then save changes here.</p>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-yellow-200">Mucus stretch</span>
            <select
              value={editor.mucusStretch}
              onChange={(e) => setEditor((prev) => ({ ...prev, mucusStretch: Number(e.target.value) as MucusStretch }))}
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
              value={editor.mucusTransparency}
              onChange={(e) =>
                setEditor((prev) => ({ ...prev, mucusTransparency: e.target.value as MucusTransparency }))
              }
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
              value={editor.mucusSlipperiness}
              onChange={(e) =>
                setEditor((prev) => ({ ...prev, mucusSlipperiness: e.target.value as MucusSlipperiness }))
              }
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
              value={editor.mostFertileFrequency}
              onChange={(e) =>
                setEditor((prev) => ({ ...prev, mostFertileFrequency: e.target.value as MostFertileFrequency }))
              }
              disabled={frequencyDisabled}
              className="w-full rounded-md border border-red-900/60 px-3 py-2"
            >
              {MOST_FERTILE_FREQUENCY_VALUES.map((value) => (
                <option key={value} value={value}>
                  {frequencyLabel(value) || "None"}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-yellow-200">Bleeding level</span>
            <select
              value={editor.bleedingLevel}
              onChange={(e) => setEditor((prev) => ({ ...prev, bleedingLevel: Number(e.target.value) }))}
              className="w-full rounded-md border border-red-900/60 px-3 py-2"
            >
              {BLEEDING_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-yellow-200">Intercourse</span>
            <div className="mt-2">
              <input
                type="checkbox"
                checked={editor.intercourse}
                onChange={(e) => setEditor((prev) => ({ ...prev, intercourse: e.target.checked }))}
                className="h-4 w-4"
              />
            </div>
          </label>
        </div>

        <label className="mt-3 block text-sm">
          <span className="mb-1 block font-medium text-yellow-200">Notes</span>
          <textarea
            value={editor.notes}
            onChange={(e) => setEditor((prev) => ({ ...prev, notes: e.target.value }))}
            rows={3}
            className="w-full rounded-md border border-red-900/60 px-3 py-2"
          />
        </label>

        {message ? <p className="mt-2 text-sm text-yellow-300">{message}</p> : null}

        <button
          type="button"
          onClick={saveSelectedDate}
          disabled={saving || clearing}
          className="mt-3 rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-yellow-50 hover:bg-red-600 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save selected date"}
        </button>

        <button
          type="button"
          onClick={clearSelectedDate}
          disabled={saving || clearing}
          className="ml-2 mt-3 rounded-md border border-red-700/70 px-4 py-2 text-sm font-semibold text-yellow-100 hover:bg-red-950/40 disabled:opacity-60"
        >
          {clearing ? "Clearing..." : "Clear selected date"}
        </button>
      </div>

      <div className="rounded-2xl border border-red-900/60 bg-zinc-950 p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-yellow-100">Symptom Table</h2>
        <p className="mb-3 text-xs text-yellow-300/80">Creighton-focused track values by day.</p>
        {days.length === 0 ? (
          <p className="text-xs text-yellow-300/80">No recorded entries yet for this cycle.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-max border-collapse text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-zinc-950 px-2 py-1 text-left text-yellow-200">Track</th>
                  {days.map((day) => (
                    <th key={day.date} className="px-2 py-1 text-yellow-300/80">
                      {day.cycleDay ?? "-"}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trackRows.map((row) => (
                  <tr key={row.label}>
                    <td className="sticky left-0 z-10 border-t border-red-900/40 bg-zinc-950 px-2 py-1 font-medium text-yellow-200">
                      {row.label}
                    </td>
                    {days.map((day) => (
                      <td
                        key={`${row.label}-${day.date}`}
                        className="border-t border-red-900/40 bg-black/20 px-2 py-1 text-center text-yellow-100"
                      >
                        {row.valueForDay(day)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-[11px] text-yellow-500/70">
          Mucus code format: stretch + optional transparency (6/8/10 only) + optional L. M/H bleeding suppresses mucus scoring.
        </p>
      </div>
    </div>
  );
}
