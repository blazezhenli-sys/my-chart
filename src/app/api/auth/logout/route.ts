import { NextRequest } from "next/server";

import { clearSessionCookie, revokeCurrentRequestSession } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    await revokeCurrentRequestSession(request);
    const response = jsonOk({ ok: true });
    clearSessionCookie(response, request);
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
