"use client";

import { FormEvent, useState } from "react";

import { apiFetch } from "@/lib/client-api";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      window.location.assign("/");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Login failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-red-900/60 bg-zinc-950 p-6 shadow-sm">
      <div>
        <label className="mb-1 block text-sm font-medium text-yellow-200" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-red-900/60 px-3 py-2"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-yellow-200" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={10}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-red-900/60 px-3 py-2"
        />
      </div>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-red-700 px-4 py-2 font-semibold text-yellow-50 hover:bg-red-600 disabled:opacity-60"
      >
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
