"use client";

import { useState } from "react";

import { apiFetch } from "@/lib/client-api";
import type { CycleView } from "@/types/app";
import { DailyEntryForm } from "@/components/DailyEntryForm";

type EntriesManagerProps = {
  cycle: CycleView;
};

function mucusCode(day: CycleView["days"][number]) {
  if (day.bleedingLevel >= 3) {
    return "-";
  }

  const transparency = day.mucusStretch >= 6 && day.mucusTransparency !== "X" ? day.mucusTransparency : "";
  const lubricative = day.mucusSlipperiness === "L" ? "L" : "";
  return `${day.mucusStretch}${transparency}${lubricative}`;
}

function frequencyLabel(day: CycleView["days"][number]) {
  if (day.bleedingLevel >= 3) return "-";
  const value = day.mostFertileFrequency;
  if (value === "ONE") return "1";
  if (value === "TWO") return "2";
  if (value === "THREE") return "3";
  if (value === "AD") return "AD";
  return "-";
}

export function EntriesManager({ cycle }: EntriesManagerProps) {
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideStatus, setOverrideStatus] = useState<"fertile" | "non_fertile" | "uncertain">("uncertain");
  const [message, setMessage] = useState<string | null>(null);

  const editingDay = cycle.days.find((day) => day.date === editingDate);

  async function applyOverride(date: string) {
    setMessage(null);

    try {
      await apiFetch(`/api/cycles/${cycle.id}/days/${date}/override`, {
        method: "PATCH",
        body: JSON.stringify({ status: overrideStatus, reason: overrideReason }),
      });
      setMessage(`Override saved for ${date}. Refresh to see latest data.`);
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save override");
    }
  }

  return (
    <div className="space-y-4">
      {message ? <p className="text-sm text-red-400">{message}</p> : null}
      {editingDay ? (
        <div className="rounded-2xl border border-red-900/60 bg-zinc-900 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-yellow-100">Editing {editingDay.date}</h3>
            <button className="text-xs text-yellow-300/80 underline" onClick={() => setEditingDate(null)}>
              Close
            </button>
          </div>
          <DailyEntryForm
            cycleId={cycle.id}
            initialDay={editingDay}
            cycleStartDate={cycle.startDate}
            cycleEndDate={cycle.endDate}
          />
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-red-900/60 bg-zinc-950">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-900 text-left text-yellow-200">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Cycle day</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Mucus Code</th>
              <th className="px-3 py-2">Frequency</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {cycle.days.map((day) => (
              <tr key={day.date} className="border-t border-red-900/40">
                <td className="px-3 py-2">{day.date}</td>
                <td className="px-3 py-2">{day.cycleDay ?? "-"}</td>
                <td className="px-3 py-2">{day.status}</td>
                <td className="px-3 py-2">{mucusCode(day)}</td>
                <td className="px-3 py-2">{frequencyLabel(day)}</td>
                <td className="px-3 py-2">
                  <button
                    className="mr-2 rounded border border-red-900/60 px-2 py-1 text-xs hover:bg-zinc-900"
                    onClick={() => setEditingDate(day.date)}
                  >
                    Edit
                  </button>
                  <button
                    className="rounded border border-yellow-600/60 px-2 py-1 text-xs hover:bg-yellow-900/20"
                    onClick={() => {
                      setEditingDate(day.date);
                      setOverrideStatus(day.status);
                    }}
                  >
                    Override
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-yellow-700/50 bg-yellow-900/20 p-4">
        <h3 className="mb-2 text-sm font-semibold text-yellow-200">Manual Override</h3>
        <div className="grid gap-2 md:grid-cols-3">
          <select
            className="rounded border border-yellow-600/60 px-3 py-2"
            value={overrideStatus}
            onChange={(e) => setOverrideStatus(e.target.value as "fertile" | "non_fertile" | "uncertain")}
          >
            <option value="fertile">fertile</option>
            <option value="non_fertile">non_fertile</option>
            <option value="uncertain">uncertain</option>
          </select>
          <input
            className="rounded border border-yellow-600/60 px-3 py-2 md:col-span-2"
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            placeholder="Reason (required)"
          />
        </div>
        <p className="mt-2 text-xs text-yellow-200">Choose a day with Edit, then click Override there to apply this status/reason.</p>
        {editingDay ? (
          <button
            className="mt-3 rounded bg-yellow-600 px-3 py-2 text-xs font-semibold text-yellow-50 hover:bg-yellow-500"
            onClick={() => applyOverride(editingDay.date)}
          >
            Apply override to {editingDay.date}
          </button>
        ) : (
          <p className="mt-3 text-xs text-yellow-200">Select a day first.</p>
        )}
      </div>
    </div>
  );
}
