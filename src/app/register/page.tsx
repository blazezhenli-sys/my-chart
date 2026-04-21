import Link from "next/link";
import { redirect } from "next/navigation";

import { RegisterForm } from "@/components/RegisterForm";
import { getAuthFromServerCookies } from "@/lib/auth";

export default async function RegisterPage() {
  const auth = await getAuthFromServerCookies();
  if (auth) {
    redirect("/");
  }

  return (
    <section className="mx-auto max-w-md space-y-4">
      <div className="rounded-2xl border border-red-900/60 bg-zinc-950 p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-yellow-100">Create your account</h1>
        <p className="mt-1 text-sm text-yellow-300/80">Single-user mode: one account for this deployment.</p>
      </div>
      <RegisterForm />
      <p className="rounded-xl border border-yellow-700/50 bg-yellow-900/20 p-3 text-xs text-yellow-200">
        This deployment only allows one account. If registration fails, use the login page for the existing account.
      </p>
      <p className="text-sm text-yellow-300/80">
        Already registered? <Link href="/login" className="font-semibold text-red-400">Sign in</Link>
      </p>
    </section>
  );
}
