import { redirect } from "next/navigation";

import { getAuthFromServerCookies } from "@/lib/auth";
import { ensureUserSettings, getCurrentCycle } from "@/lib/cycle";

export async function requirePageAuth() {
  const auth = await getAuthFromServerCookies();
  if (!auth) {
    redirect("/login");
  }

  return auth;
}

export async function loadUserContext() {
  const auth = await requirePageAuth();
  const cycle = await getCurrentCycle(auth.user.id);
  const settings = await ensureUserSettings(auth.user.id);

  return {
    user: auth.user,
    cycle,
    settings: {
      ...settings,
      disclaimerAcceptedAt: settings.disclaimerAcceptedAt?.toISOString() ?? null,
    },
  };
}
