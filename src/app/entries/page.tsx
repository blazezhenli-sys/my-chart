import { CycleSelector } from "@/components/CycleSelector";
import { EditCycleDatesForm } from "@/components/EditCycleDatesForm";
import { EntriesManager } from "@/components/EntriesManager";
import { getCurrentCycle, getCycle, listCycles } from "@/lib/cycle";
import { requirePageAuth } from "@/lib/server-data";

type EntriesPageProps = {
  searchParams?: Promise<{ cycleId?: string | string[] }>;
};

export default async function EntriesPage({ searchParams }: EntriesPageProps) {
  const auth = await requirePageAuth();
  const params = (await searchParams) ?? {};
  const requestedCycleId = Array.isArray(params.cycleId) ? params.cycleId[0] : params.cycleId;

  const cycles = await listCycles(auth.user.id);
  const requestedCycle = requestedCycleId ? await getCycle(auth.user.id, requestedCycleId) : null;
  const cycle = requestedCycle ?? (await getCurrentCycle(auth.user.id));

  if (!cycle) {
    return <p className="rounded-2xl border border-red-900/60 bg-zinc-950 p-4 text-sm">No active cycle yet.</p>;
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-red-900/60 bg-zinc-950 p-4 shadow-sm">
        <h1 className="text-2xl font-bold">Entries</h1>
        <p className="text-sm text-yellow-300/80">Review, edit, and override daily observations.</p>
      </div>
      <CycleSelector cycles={cycles} currentCycleId={cycle.id} basePath="/entries" />
      <EditCycleDatesForm cycle={cycle} />
      <EntriesManager cycle={cycle} />
    </section>
  );
}
