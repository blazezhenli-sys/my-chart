"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/lib/client-api";

function todayIso() {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function CreateCycleForm() {
  const router = useRouter();
  const [startDate, setStartDate] = useState<string>(() => todayIso());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFutureDate = useMemo(() => startDate > todayIso(), [startDate]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      await apiFetch("/api/cycles", {
        method: "POST",
        body: JSON.stringify({ startDate }),
      });
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not create cycle");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-red-900/60 bg-zinc-950 p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-yellow-100">Start a Cycle</h2>
      <p className="text-sm text-yellow-300/80">Create your active cycle to begin daily symptothermal tracking.</p>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-yellow-200">Cycle start date</span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          required
          className="w-full rounded-md border border-red-900/60 px-3 py-2"
        />
      </label>
      {isFutureDate ? <p className="text-xs text-yellow-300">Future dates are allowed but unusual for cycle start.</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-yellow-50 hover:bg-red-600 disabled:opacity-60"
      >
        {pending ? "Creating..." : "Create active cycle"}
      </button>
    </form>
  );
}
