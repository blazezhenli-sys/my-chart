"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/lib/client-api";
import type { SettingsView } from "@/types/app";

type SettingsFormProps = {
  settings: SettingsView;
};

export function SettingsForm({ settings }: SettingsFormProps) {
  const router = useRouter();

  const [preferredUnit, setPreferredUnit] = useState(settings.preferredUnit);
  const [cycleLengthHint, setCycleLengthHint] = useState(settings.cycleLengthHint?.toString() ?? "");
  const [lutealLengthHint, setLutealLengthHint] = useState(settings.lutealLengthHint?.toString() ?? "");
  const [tempRiseThresholdC, setTempRiseThresholdC] = useState(settings.tempRiseThresholdC.toString());
  const [acceptDisclaimer, setAcceptDisclaimer] = useState(Boolean(settings.disclaimerAcceptedAt));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      await apiFetch("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({
          preferredUnit,
          cycleLengthHint: cycleLengthHint === "" ? null : Number(cycleLengthHint),
          lutealLengthHint: lutealLengthHint === "" ? null : Number(lutealLengthHint),
          tempRiseThresholdC: Number(tempRiseThresholdC),
          acceptDisclaimer,
        }),
      });
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to update settings");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-red-900/60 bg-zinc-950 p-6 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-yellow-200">Preferred temperature unit</span>
          <select
            value={preferredUnit}
            onChange={(e) => setPreferredUnit(e.target.value as "C" | "F")}
            className="w-full rounded-md border border-red-900/60 px-3 py-2"
          >
            <option value="C">Celsius</option>
            <option value="F">Fahrenheit</option>
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-yellow-200">Temp rise threshold (C)</span>
          <input
            type="number"
            step="0.01"
            min={0.05}
            max={0.5}
            value={tempRiseThresholdC}
            onChange={(e) => setTempRiseThresholdC(e.target.value)}
            className="w-full rounded-md border border-red-900/60 px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-yellow-200">Cycle length hint</span>
          <input
            type="number"
            min={15}
            max={60}
            value={cycleLengthHint}
            onChange={(e) => setCycleLengthHint(e.target.value)}
            className="w-full rounded-md border border-red-900/60 px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-yellow-200">Luteal length hint</span>
          <input
            type="number"
            min={7}
            max={20}
            value={lutealLengthHint}
            onChange={(e) => setLutealLengthHint(e.target.value)}
            className="w-full rounded-md border border-red-900/60 px-3 py-2"
          />
        </label>
      </div>

      <div className="rounded-xl border border-yellow-700/50 bg-yellow-900/20 p-3">
        <p className="text-sm text-yellow-200">
          Educational use only. This app does not provide medical diagnosis or treatment recommendations.
        </p>
        <label className="mt-2 flex items-center gap-2 text-sm text-yellow-200">
          <input
            type="checkbox"
            checked={acceptDisclaimer}
            onChange={(e) => setAcceptDisclaimer(e.target.checked)}
            className="h-4 w-4"
          />
          I understand and accept this disclaimer.
        </label>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-yellow-50 hover:bg-red-600 disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save settings"}
      </button>
    </form>
  );
}
