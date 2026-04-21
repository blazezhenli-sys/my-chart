import { NextRequest } from "next/server";

import { attachSessionCookie, createSession, verifyPassword } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { jsonOk, jsonError } from "@/lib/http";
import { logEvent } from "@/lib/logging";
import { prisma } from "@/lib/prisma";
import { loginSchema, parseJsonBody } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = parseJsonBody(loginSchema, body);
    if (!parsed.ok) {
      throw new ApiError(400, "INVALID_REQUEST", "Invalid login payload", parsed.issues);
    }

    const email = parsed.value.email.toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email },
      include: { settings: true },
    });

    if (!user) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");
    }

    const valid = await verifyPassword(user.passwordHash, parsed.value.password);
    if (!valid) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");
    }

    const session = await createSession(user.id);
    const response = jsonOk({
      user: {
        id: user.id,
        email: user.email,
        settings: user.settings,
      },
    });
    attachSessionCookie(response, session.token, session.expiresAt, request);

    logEvent("info", "auth.login", { userId: user.id });

    return response;
  } catch (error) {
    return jsonError(error);
  }
}
