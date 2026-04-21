import { NextRequest } from "next/server";

import { requireAuthFromRequest } from "@/lib/auth";
import { getCurrentCycle } from "@/lib/cycle";
import { jsonOk, jsonError } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthFromRequest(request);
    const cycle = await getCurrentCycle(auth.user.id);

    return jsonOk({ cycle });
  } catch (error) {
    return jsonError(error);
  }
}
