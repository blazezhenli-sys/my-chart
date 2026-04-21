import { NextResponse } from "next/server";

import { ApiError, isApiError } from "@/lib/errors";

type PlainError = {
  status?: number;
  code?: string;
  message?: string;
  details?: unknown;
};

function isPlainError(value: unknown): value is PlainError {
  if (!value || typeof value !== "object") {
    return false;
  }

  return "status" in value || "code" in value || "message" in value;
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, { status: 200, ...init });
}

export function jsonCreated<T>(data: T) {
  return NextResponse.json({ data }, { status: 201 });
}

export function jsonError(error: unknown, fallbackCode = "INTERNAL_ERROR") {
  if (isApiError(error)) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details ?? null,
        },
      },
      { status: error.status },
    );
  }

  if (isPlainError(error)) {
    return NextResponse.json(
      {
        error: {
          code: error.code ?? fallbackCode,
          message: error.message ?? "Unexpected server error",
          details: error.details ?? null,
        },
      },
      { status: error.status ?? 500 },
    );
  }

  return NextResponse.json(
    {
      error: {
        code: fallbackCode,
        message: "Unexpected server error",
        details: null,
      },
    },
    { status: 500 },
  );
}

export function assertOrThrow(condition: unknown, status: number, code: string, message: string) {
  if (!condition) {
    throw new ApiError(status, code, message);
  }
}
