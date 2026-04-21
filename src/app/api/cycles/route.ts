import { NextRequest } from "next/server";

import { requireAuthFromRequest } from "@/lib/auth";
import { createCycle, recomputeCycle } from "@/lib/cycle";
import { ApiError } from "@/lib/errors";
import { jsonCreated, jsonError, jsonOk } from "@/lib/http";
import { startOfDayUtc } from "@/lib/dates";
import { parseJsonBody, createCycleSchema } from "@/lib/validation";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthFromRequest(request);
    const cycles = await prisma.cycle.findMany({
      where: { userId: auth.user.id },
      orderBy: { startDate: "desc" },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        isActive: true,
      },
    });

    return jsonOk({
      cycles: cycles.map((cycle) => ({
        id: cycle.id,
        startDate: cycle.startDate.toISOString().slice(0, 10),
        endDate: cycle.endDate ? cycle.endDate.toISOString().slice(0, 10) : null,
        isActive: cycle.isActive,
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthFromRequest(request);
    const body = await request.json().catch(() => null);
    const parsed = parseJsonBody(createCycleSchema, body);
    if (!parsed.ok) {
      throw new ApiError(400, "INVALID_REQUEST", "Invalid cycle payload", parsed.issues);
    }

    const cycle = await createCycle(auth.user.id, startOfDayUtc(parsed.value.startDate));
    await recomputeCycle(cycle.id, auth.user.id);

    return jsonCreated({ cycle });
  } catch (error) {
    return jsonError(error);
  }
}
