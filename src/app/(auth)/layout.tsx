import Link from "next/link";
import { Logo } from "@/components/home/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white">
      {/* Glow accents mirroring the landing hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-indigo-500/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-fuchsia-500/20 blur-3xl"
      />

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link href="/" aria-label="KaptrixComply home" className="group">
          <Logo
            wordClassName="text-lg sm:text-xl text-white"
            markClassName="h-7 w-7"
          />
        </Link>
        <Link
          href="/how-it-works"
          className="text-sm font-medium text-white/70 transition hover:text-white"
        >
          How it works
        </Link>
      </header>

      <main className="relative z-10 flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 pb-16 sm:pb-20">
        <div className="w-full max-w-md space-y-6 rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-indigo-950/40 backdrop-blur-xl sm:space-y-8 sm:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
