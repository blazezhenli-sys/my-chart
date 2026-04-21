import { CreateCycleForm } from "@/components/CreateCycleForm";
import { DailyEntryForm } from "@/components/DailyEntryForm";
import { EndCycleForm } from "@/components/EndCycleForm";
import { loadUserContext } from "@/lib/server-data";

export default async function DashboardPage() {
  const { cycle, settings } = await loadUserContext();

  if (!cycle) {
    return (
      <section className="space-y-4">
        <div className="rounded-2xl border border-red-900/60 bg-zinc-950 p-5 shadow-sm">
          <h1 className="text-2xl font-bold text-yellow-100">Welcome to your NFP dashboard</h1>
          <p className="mt-1 text-sm text-yellow-300/80">
            Start a cycle to begin symptothermal observations and fertility status interpretation.
          </p>
        </div>
        <CreateCycleForm />
      </section>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const todayDay = cycle.days.find((day) => day.date === today);
  const latestDay = cycle.days[cycle.days.length - 1];

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-red-900/60 bg-zinc-950 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-yellow-400/70">Active cycle</p>
          <p className="mt-1 text-xl font-semibold">Started {cycle.startDate}</p>
          <p className="mt-1 text-sm text-yellow-300/80">{cycle.days.length} logged day(s)</p>
        </div>
        <div className="rounded-2xl border border-red-900/60 bg-zinc-950 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-yellow-400/70">Today&apos;s status</p>
          <p className="mt-1 text-xl font-semibold">{todayDay?.status ?? "No entry yet"}</p>
          <p className="mt-1 text-sm text-yellow-300/80">Auto: {todayDay?.autoStatus ?? "-"}</p>
        </div>
        <div className="rounded-2xl border border-red-900/60 bg-zinc-950 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-yellow-400/70">Latest interpretation</p>
          <p className="mt-1 text-xl font-semibold">{latestDay?.status ?? "None"}</p>
          <p className="mt-1 text-sm text-yellow-300/80">Date: {latestDay?.date ?? "-"}</p>
        </div>
      </div>

      {settings.disclaimerAcceptedAt ? null : (
        <div className="rounded-2xl border border-yellow-700/50 bg-yellow-900/20 p-4 text-sm text-yellow-200">
          Interpretation is disabled until you accept the educational disclaimer in Settings.
        </div>
      )}

      {cycle.interpretationStale ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          Interpretation is stale. Reason: {cycle.interpretationStaleReason ?? "unknown"}. Recompute from entries if needed.
        </div>
      ) : null}

      <EndCycleForm cycleId={cycle.id} cycleStartDate={cycle.startDate} />

      <div className="rounded-2xl border border-red-900/60 bg-zinc-950 p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Quick daily entry</h2>
        <DailyEntryForm
          cycleId={cycle.id}
          initialDay={todayDay}
          cycleStartDate={cycle.startDate}
          cycleEndDate={cycle.endDate}
        />
      </div>
    </section>
  );
}
