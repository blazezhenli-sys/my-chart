import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/LoginForm";
import { getAuthFromServerCookies } from "@/lib/auth";

export default async function LoginPage() {
  const auth = await getAuthFromServerCookies();
  if (auth) {
    redirect("/");
  }

  return (
    <section className="mx-auto max-w-md space-y-4">
      <div className="rounded-2xl border border-red-900/60 bg-zinc-950 p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-yellow-100">Sign in</h1>
        <p className="mt-1 text-sm text-yellow-300/80">Access your private NFP chart.</p>
      </div>
      <LoginForm />
      <p className="text-sm text-yellow-300/80">
        Need first-time setup? <Link href="/register" className="font-semibold text-red-400">Register</Link>
      </p>
    </section>
  );
}
