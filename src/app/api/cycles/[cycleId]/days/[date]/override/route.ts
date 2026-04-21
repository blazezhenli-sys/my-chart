import { NextRequest } from "next/server";

import { requireAuthFromRequest } from "@/lib/auth";
import { getCycle, upsertOverride } from "@/lib/cycle";
import { startOfDayUtc } from "@/lib/dates";
import { ApiError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";
import { overrideSchema, parseJsonBody } from "@/lib/validation";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ cycleId: string; date: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuthFromRequest(request);
    const { cycleId, date } = await params;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new ApiError(400, "INVALID_DATE", "Date must be in YYYY-MM-DD format");
    }

    const body = await request.json().catch(() => null);
    const parsed = parseJsonBody(overrideSchema, body);
    if (!parsed.ok) {
      throw new ApiError(400, "INVALID_REQUEST", "Invalid override payload", parsed.issues);
    }

    const override = await upsertOverride({
      userId: auth.user.id,
      cycleId,
      date: startOfDayUtc(date),
      status: parsed.value.status,
      reason: parsed.value.reason,
    });

    const cycle = await getCycle(auth.user.id, cycleId);

    return jsonOk({
      override: {
        ...override,
        date: override.date.toISOString().slice(0, 10),
      },
      cycle,
    });
  } catch (error) {
    return jsonError(error);
  }
}
