"use client";

type ErrorShape = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export async function apiFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const payload = (await response.json().catch(() => null)) as { data?: T } & ErrorShape | null;

  if (!response.ok) {
    const message = payload?.error?.message ?? "Request failed";
    const code = payload?.error?.code ? ` (${payload.error.code})` : "";
    throw new Error(`${message}${code}`);
  }

  return payload?.data as T;
}
