"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/lib/client-api";

type EndCycleFormProps = {
  cycleId: string;
  cycleStartDate: string;
};

function todayIso() {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function EndCycleForm({ cycleId, cycleStartDate }: EndCycleFormProps) {
  const router = useRouter();
  const [endDate, setEndDate] = useState<string>(() => todayIso());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const invalidBeforeStart = useMemo(() => endDate < cycleStartDate, [endDate, cycleStartDate]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (invalidBeforeStart) {
      setError("End date cannot be before cycle start date.");
      return;
    }

    setPending(true);

    try {
      await apiFetch(`/api/cycles/${cycleId}`, {
        method: "PATCH",
        body: JSON.stringify({
          endDate,
          isActive: false,
        }),
      });
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not end cycle");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-red-900/60 bg-zinc-950 p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-yellow-100">End Current Cycle</h2>
      <p className="text-sm text-yellow-300/80">
        Once ended, you can immediately start a new cycle from this dashboard.
      </p>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-yellow-200">Cycle end date</span>
        <input
          type="date"
          min={cycleStartDate}
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          required
          className="w-full rounded-md border border-red-900/60 px-3 py-2"
        />
      </label>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-red-600/70 bg-red-900/40 px-4 py-2 text-sm font-semibold text-yellow-50 hover:bg-red-800/50 disabled:opacity-60"
      >
        {pending ? "Ending..." : "End cycle"}
      </button>
    </form>
  );
}
