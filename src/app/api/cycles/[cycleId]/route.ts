import { NextRequest } from "next/server";

import { requireAuthFromRequest } from "@/lib/auth";
import { getCycle, markCycleStale, recomputeCycle, updateCycle } from "@/lib/cycle";
import { startOfDayUtc } from "@/lib/dates";
import { ApiError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { logEvent } from "@/lib/logging";
import { parseJsonBody, updateCycleSchema } from "@/lib/validation";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ cycleId: string }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuthFromRequest(request);
    const { cycleId } = await params;

    const cycle = await getCycle(auth.user.id, cycleId);
    if (!cycle) {
      throw new ApiError(404, "CYCLE_NOT_FOUND", "Cycle not found");
    }

    return jsonOk({ cycle });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuthFromRequest(request);
    const { cycleId } = await params;

    const body = await request.json().catch(() => null);
    const parsed = parseJsonBody(updateCycleSchema, body);
    if (!parsed.ok) {
      throw new ApiError(400, "INVALID_REQUEST", "Invalid cycle patch payload", parsed.issues);
    }

    const cycle = await updateCycle(auth.user.id, cycleId, {
      startDate: parsed.value.startDate ? startOfDayUtc(parsed.value.startDate) : undefined,
      endDate: parsed.value.endDate === undefined ? undefined : parsed.value.endDate ? startOfDayUtc(parsed.value.endDate) : null,
      isActive: parsed.value.isActive,
    });

    let recomputeWarning: string | null = null;

    try {
      await recomputeCycle(cycleId, auth.user.id);
    } catch (recomputeError) {
      const reason = recomputeError instanceof Error ? recomputeError.message : "recompute_failed";
      await markCycleStale(cycleId, reason);
      recomputeWarning = "Interpretation recompute failed; cycle marked stale.";
      logEvent("error", "cycle.recompute.failure", { cycleId, reason });
    }

    return jsonOk({ cycle, warning: recomputeWarning });
  } catch (error) {
    return jsonError(error);
  }
}
