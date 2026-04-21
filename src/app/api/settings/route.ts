import { NextRequest } from "next/server";

import { requireAuthFromRequest } from "@/lib/auth";
import { ensureUserSettings, getCurrentCycle, markCycleStale, recomputeCycle } from "@/lib/cycle";
import { jsonError, jsonOk } from "@/lib/http";
import { logEvent } from "@/lib/logging";
import { prisma } from "@/lib/prisma";
import { parseJsonBody, settingsSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthFromRequest(request);
    const settings = await ensureUserSettings(auth.user.id);
    return jsonOk({ settings });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuthFromRequest(request);
    const body = await request.json().catch(() => null);
    const parsed = parseJsonBody(settingsSchema, body);
    if (!parsed.ok) {
      return jsonError({
        status: 400,
        code: "INVALID_REQUEST",
        message: "Invalid settings payload",
        details: parsed.issues,
      });
    }

    const settings = await ensureUserSettings(auth.user.id);
    const updated = await prisma.userSettings.update({
      where: { id: settings.id },
      data: {
        preferredUnit: parsed.value.preferredUnit,
        cycleLengthHint: parsed.value.cycleLengthHint,
        lutealLengthHint: parsed.value.lutealLengthHint,
        tempRiseThresholdC: parsed.value.tempRiseThresholdC,
        disclaimerAcceptedAt: parsed.value.acceptDisclaimer ? new Date() : settings.disclaimerAcceptedAt,
      },
    });

    const activeCycle = await prisma.cycle.findFirst({
      where: {
        userId: auth.user.id,
        isActive: true,
      },
      select: { id: true },
    });

    if (activeCycle) {
      await recomputeCycle(activeCycle.id, auth.user.id).catch(async (error) => {
        const reason = error instanceof Error ? error.message : "recompute_failed";
        await markCycleStale(activeCycle.id, reason);
        logEvent("error", "settings.recompute.failure", { cycleId: activeCycle.id, reason });
      });
    }

    const cycle = await getCurrentCycle(auth.user.id);

    return jsonOk({ settings: updated, cycle });
  } catch (error) {
    return jsonError(error);
  }
}
