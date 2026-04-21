import Link from "next/link";

type CycleSummary = {
  id: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  dayCount: number;
};

type CycleSelectorProps = {
  cycles: CycleSummary[];
  currentCycleId: string | null;
  basePath: "/chart" | "/entries";
};

function cycleLabel(cycle: CycleSummary) {
  const range = `${cycle.startDate} -> ${cycle.endDate ?? "Active"}`;
  return `${range} (${cycle.dayCount}d)`;
}

export function CycleSelector({ cycles, currentCycleId, basePath }: CycleSelectorProps) {
  if (cycles.length <= 1) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-red-900/60 bg-zinc-950 p-3 shadow-sm">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-yellow-400/80">Cycles</p>
      <div className="flex flex-wrap gap-2">
        {cycles.map((cycle) => {
          const selected = cycle.id === currentCycleId;
          return (
            <Link
              key={cycle.id}
              href={`${basePath}?cycleId=${cycle.id}`}
              className={[
                "rounded-md border px-3 py-1 text-xs transition",
                selected
                  ? "border-yellow-400 bg-red-900/40 text-yellow-100"
                  : "border-red-900/60 text-yellow-300/90 hover:bg-red-950/40",
              ].join(" ")}
            >
              {cycleLabel(cycle)}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
