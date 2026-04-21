import { NextRequest } from "next/server";

import { requireAuthFromRequest } from "@/lib/auth";
import { getCycle } from "@/lib/cycle";
import { ApiError } from "@/lib/errors";
import { jsonError, jsonOk } from "@/lib/http";

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

    return jsonOk({ days: cycle.days });
  } catch (error) {
    return jsonError(error);
  }
}
