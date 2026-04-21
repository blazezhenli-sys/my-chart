import { NextRequest } from "next/server";

import { getAuthFromRequest } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return jsonOk({ user: null });
    }

    return jsonOk({
      user: {
        id: auth.user.id,
        email: auth.user.email,
        settings: auth.user.settings,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
