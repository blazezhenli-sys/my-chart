import { NextRequest } from "next/server";

import { requireAuthFromRequest } from "@/lib/auth";
import { clearDailyObservation, getCycle, markCycleStale, recomputeCycle, upsertDailyObservation } from "@/lib/cycle";
import { startOfDayUtc } from "@/lib/dates";
import { ApiError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { logEvent } from "@/lib/logging";
import { dailyObservationSchema, parseJsonBody } from "@/lib/validation";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ cycleId: string; date: string }>;
};

async function recomputeCycleOrMarkStale(cycleId: string, userId: string) {
  let recomputeWarning: string | null = null;

  try {
    await recomputeCycle(cycleId, userId);
  } catch (recomputeError) {
    const reason = recomputeError instanceof Error ? recomputeError.message : "recompute_failed";
    await markCycleStale(cycleId, reason);
    recomputeWarning = "Interpretation recompute failed; cycle marked stale.";
    logEvent("error", "cycle.recompute.failure", { cycleId, reason });
  }

  return recomputeWarning;
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuthFromRequest(request);
    const { cycleId, date } = await params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new ApiError(400, "INVALID_DATE", "Date must be in YYYY-MM-DD format");
    }

    const body = await request.json().catch(() => null);
    const parsed = parseJsonBody(dailyObservationSchema, body);
    if (!parsed.ok) {
      throw new ApiError(400, "INVALID_REQUEST", "Invalid observation payload", parsed.issues);
    }

    const day = await upsertDailyObservation({
      userId: auth.user.id,
      cycleId,
      date: startOfDayUtc(date),
      bbtValue: parsed.value.bbtValue,
      bbtUnit: parsed.value.bbtUnit ?? "C",
      mucusStretch: parsed.value.mucusStretch ?? 0,
      mucusTransparency: parsed.value.mucusTransparency ?? "X",
      mucusSlipperiness: parsed.value.mucusSlipperiness ?? "X",
      mostFertileFrequency: parsed.value.mostFertileFrequency ?? "NONE",
      cervixPosition: parsed.value.cervixPosition ?? "unknown",
      bleedingLevel: parsed.value.bleedingLevel ?? 0,
      intercourse: parsed.value.intercourse ?? false,
      notes: parsed.value.notes ?? "",
    });

    const recomputeWarning = await recomputeCycleOrMarkStale(cycleId, auth.user.id);

    const cycle = await getCycle(auth.user.id, cycleId);

    return jsonOk({
      day: {
        ...day,
        date: day.date.toISOString().slice(0, 10),
      },
      cycle,
      warning: recomputeWarning,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuthFromRequest(request);
    const { cycleId, date } = await params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new ApiError(400, "INVALID_DATE", "Date must be in YYYY-MM-DD format");
    }

    const result = await clearDailyObservation({
      userId: auth.user.id,
      cycleId,
      date: startOfDayUtc(date),
    });

    const recomputeWarning = await recomputeCycleOrMarkStale(cycleId, auth.user.id);
    const cycle = await getCycle(auth.user.id, cycleId);

    return jsonOk({
      cleared: result.cleared,
      cycle,
      warning: recomputeWarning,
    });
  } catch (error) {
    return jsonError(error);
  }
}
