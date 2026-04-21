"use client";

import { useRouter } from "next/navigation";

import { apiFetch } from "@/lib/client-api";

export function LogoutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={async () => {
        await apiFetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
      className="rounded-md border border-red-900/60 px-3 py-1 text-sm text-yellow-200 hover:bg-zinc-900"
    >
      Log out
    </button>
  );
}
