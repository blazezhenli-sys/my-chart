"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/lib/client-api";
import type { CycleView } from "@/types/app";

type EditCycleDatesFormProps = {
  cycle: CycleView;
};

export function EditCycleDatesForm({ cycle }: EditCycleDatesFormProps) {
  const router = useRouter();
  const [startDate, setStartDate] = useState(cycle.startDate);
  const [endDate, setEndDate] = useState(cycle.endDate ?? "");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const invalidRange = useMemo(() => Boolean(endDate) && endDate < startDate, [startDate, endDate]);

  useEffect(() => {
    setStartDate(cycle.startDate);
    setEndDate(cycle.endDate ?? "");
    setMessage(null);
  }, [cycle.id, cycle.startDate, cycle.endDate]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);

    if (invalidRange) {
      setMessage("End date cannot be before start date.");
      return;
    }

    setPending(true);

    try {
      await apiFetch(`/api/cycles/${cycle.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          startDate,
          endDate: cycle.isActive ? null : endDate || null,
          isActive: cycle.isActive,
        }),
      });
      setMessage("Cycle dates updated.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update cycle dates");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-red-900/60 bg-zinc-950 p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-yellow-100">Edit Cycle Dates</h2>
      <p className="mt-1 text-xs text-yellow-300/80">
        {cycle.isActive
          ? "For active cycles, edit the start date here. End it from the dashboard."
          : "Adjust start and end dates for this cycle."}
      </p>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-yellow-200">Start date</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-md border border-red-900/60 px-3 py-2"
            required
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-yellow-200">End date</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate}
            disabled={cycle.isActive}
            className="w-full rounded-md border border-red-900/60 px-3 py-2 disabled:opacity-50"
            required={!cycle.isActive}
          />
        </label>
      </div>

      {message ? <p className="mt-2 text-xs text-yellow-300">{message}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-3 rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-yellow-50 hover:bg-red-600 disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save cycle dates"}
      </button>
    </form>
  );
}
