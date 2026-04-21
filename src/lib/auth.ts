import { randomBytes, createHash } from "crypto";

import argon2 from "argon2";
import { type BbtUnit } from "@prisma/client";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";

import { ApiError } from "@/lib/errors";
import { logEvent } from "@/lib/logging";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "nfp_session";
const DEFAULT_SESSION_TTL_HOURS = 24 * 30;

function sessionTtlMs() {
  const raw = Number(process.env.SESSION_TTL_HOURS ?? DEFAULT_SESSION_TTL_HOURS);
  const safeHours = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_SESSION_TTL_HOURS;
  return safeHours * 60 * 60 * 1000;
}

function hashToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}

function shouldUseSecureCookie(request?: NextRequest) {
  const override = process.env.SESSION_COOKIE_SECURE?.trim().toLowerCase();
  if (override === "true") return true;
  if (override === "false") return false;

  if (process.env.NODE_ENV !== "production") {
    return false;
  }

  if (!request) {
    return true;
  }

  const forwardedProto = request.headers.get("x-forwarded-proto")?.toLowerCase();
  if (forwardedProto) {
    return forwardedProto === "https";
  }

  return request.nextUrl.protocol === "https:";
}

export function attachSessionCookie(response: NextResponse, token: string, expiresAt: Date, request?: NextRequest) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    expires: expiresAt,
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(request),
    path: "/",
  });
}

export function clearSessionCookie(response: NextResponse, request?: NextRequest) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    expires: new Date(0),
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(request),
    path: "/",
  });
}

export async function hashPassword(password: string) {
  return argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
}

export async function verifyPassword(hash: string, password: string) {
  return argon2.verify(hash, password);
}

export async function registerSingleUser(email: string, password: string, preferredUnit: BbtUnit = "C") {
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    throw new ApiError(409, "SINGLE_USER_LOCKED", "Registration is closed: this app supports one account only.");
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      settings: {
        create: {
          preferredUnit,
        },
      },
    },
  });

  logEvent("info", "auth.register", { userId: user.id });
  return user;
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + sessionTtlMs());

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function revokeSessionByToken(token: string) {
  const tokenHash = hashToken(token);
  await prisma.session.updateMany({
    where: {
      tokenHash,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

export async function getUserFromToken(token: string) {
  const tokenHash = hashToken(token);
  const session = await prisma.session.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      user: {
        include: { settings: true },
      },
    },
  });

  if (!session) {
    return null;
  }

  return {
    session,
    user: session.user,
  };
}

export async function getAuthFromRequest(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  return getUserFromToken(token);
}

export async function requireAuthFromRequest(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
  }

  return auth;
}

export async function getAuthFromServerCookies() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  return getUserFromToken(token);
}

export async function revokeCurrentRequestSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return;
  }

  await revokeSessionByToken(token);
}
