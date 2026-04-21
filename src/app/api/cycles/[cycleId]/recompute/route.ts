import { NextRequest } from "next/server";

import { requireAuthFromRequest } from "@/lib/auth";
import { getCycle, markCycleStale, recomputeCycle } from "@/lib/cycle";
import { jsonError, jsonOk } from "@/lib/http";
import { logEvent } from "@/lib/logging";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ cycleId: string }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuthFromRequest(request);
    const { cycleId } = await params;

    const result = await recomputeCycle(cycleId, auth.user.id).catch(async (error) => {
      const reason = error instanceof Error ? error.message : "recompute_failed";
      await markCycleStale(cycleId, reason);
      logEvent("error", "cycle.recompute.failure", { cycleId, reason });
      throw error;
    });

    const cycle = await getCycle(auth.user.id, cycleId);

    return jsonOk({
      recompute: result,
      cycle,
    });
  } catch (error) {
    return jsonError(error);
  }
}
