import { SettingsForm } from "@/components/SettingsForm";
import { loadUserContext } from "@/lib/server-data";

export default async function SettingsPage() {
  const { settings } = await loadUserContext();

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-red-900/60 bg-zinc-950 p-4 shadow-sm">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-yellow-300/80">Units, cycle hints, and interpretation disclaimer controls.</p>
      </div>
      <SettingsForm settings={settings} />
    </section>
  );
}
