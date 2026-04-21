import { NextRequest } from "next/server";

import { attachSessionCookie, createSession, registerSingleUser } from "@/lib/auth";
import { jsonCreated, jsonError } from "@/lib/http";
import { parseJsonBody, registerSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = parseJsonBody(registerSchema, body);
    if (!parsed.ok) {
      return jsonError({
        status: 400,
        code: "INVALID_REQUEST",
        message: "Invalid registration payload",
        details: parsed.issues,
      });
    }

    const user = await registerSingleUser(parsed.value.email, parsed.value.password);
    const session = await createSession(user.id);

    const response = jsonCreated({
      user: {
        id: user.id,
        email: user.email,
      },
    });

    attachSessionCookie(response, session.token, session.expiresAt, request);
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
