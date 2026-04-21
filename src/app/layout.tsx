import type { Metadata } from "next";
import Link from "next/link";
import { Space_Grotesk, Lora } from "next/font/google";

import { LogoutButton } from "@/components/LogoutButton";
import { getAuthFromServerCookies } from "@/lib/auth";

import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NFP Chart Tracker",
  description: "Symptothermal fertility tracking for natural family planning.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const auth = await getAuthFromServerCookies();

  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${lora.variable} h-full`}>
      <body
        suppressHydrationWarning
        className="min-h-full bg-gradient-to-b from-zinc-950 via-red-950 to-black text-yellow-100"
      >
        <div className="mx-auto min-h-screen max-w-6xl px-4 py-6">
          <header className="mb-6 rounded-2xl border border-red-900/60 bg-zinc-950/90 px-4 py-3 shadow-sm backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link href="/" className="text-xl font-bold tracking-tight text-red-300">
                  NFP Chart Tracker
                </Link>
                <p className="text-xs text-yellow-300/80">Educational use only. Not medical diagnosis.</p>
              </div>
              {auth ? (
                <div className="flex items-center gap-2">
                  <nav className="flex items-center gap-2 text-sm">
                    <Link className="rounded-md px-2 py-1 hover:bg-zinc-900" href="/">
                      Dashboard
                    </Link>
                    <Link className="rounded-md px-2 py-1 hover:bg-zinc-900" href="/chart">
                      Chart
                    </Link>
                    <Link className="rounded-md px-2 py-1 hover:bg-zinc-900" href="/entries">
                      Entries
                    </Link>
                    <Link className="rounded-md px-2 py-1 hover:bg-zinc-900" href="/settings">
                      Settings
                    </Link>
                  </nav>
                  <LogoutButton />
                </div>
              ) : (
                <nav className="flex items-center gap-2 text-sm">
                  <Link className="rounded-md border border-red-900/60 px-3 py-1 hover:bg-zinc-900" href="/login">
                    Login
                  </Link>
                  <Link className="rounded-md bg-red-700 px-3 py-1 font-semibold text-yellow-50 hover:bg-red-600" href="/register">
                    Register
                  </Link>
                </nav>
              )}
            </div>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
