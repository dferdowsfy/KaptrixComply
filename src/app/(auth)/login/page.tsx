"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="h-10 w-full animate-pulse rounded-md bg-white/10" />
      <div className="h-10 w-full animate-pulse rounded-md bg-white/10" />
      <div className="h-10 w-full animate-pulse rounded-md bg-white/20" />
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const supabaseConfigured = isSupabaseConfigured();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const mode = searchParams.get("mode");
    setIsSignUp(mode === "signup");
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!supabaseConfigured) {
      setMessage(
        "Supabase is not configured yet. Use /preview to see the Kaptrix UI locally.",
      );
      return;
    }

    setLoading(true);
    setMessage("");

    const supabase = createClient();

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
      } else {
        setMessage("Account created! You can now sign in.");
        setIsSignUp(false);
        setPassword("");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
      } else {
        router.push("/preview");
        return;
      }
    }

    setLoading(false);
  }

  const inputClass =
    "mt-1 block w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white shadow-sm placeholder:text-white/40 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/40";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-indigo-200/80">
          {isSignUp ? "Join Kaptrix" : "Welcome back"}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
          {isSignUp ? "Create your account" : "Sign in to Kaptrix"}
        </h2>
      </div>

      {/* Segmented Sign in / Sign up toggle */}
      <div
        role="tablist"
        aria-label="Authentication mode"
        className="grid grid-cols-2 rounded-full border border-white/10 bg-white/5 p-1 text-sm font-semibold"
      >
        <button
          type="button"
          role="tab"
          aria-selected={!isSignUp}
          onClick={() => {
            setIsSignUp(false);
            setMessage("");
          }}
          className={`rounded-full px-4 py-2 transition ${
            !isSignUp
              ? "bg-white text-slate-900 shadow"
              : "text-white/70 hover:text-white"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={isSignUp}
          onClick={() => {
            setIsSignUp(true);
            setMessage("");
          }}
          className={`rounded-full px-4 py-2 transition ${
            isSignUp
              ? "bg-white text-slate-900 shadow"
              : "text-white/70 hover:text-white"
          }`}
        >
          Sign up
        </button>
      </div>

      {!supabaseConfigured && (
        <div className="rounded-md border border-amber-200/40 bg-amber-500/10 p-3 text-sm text-amber-100">
          Local preview mode is active. Configure Supabase env vars to enable
          real authentication.
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-white/80"
        >
          Email address
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          placeholder="operator@kaptrix.com"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-white/80"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !supabaseConfigured}
        className="flex w-full justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/30 transition hover:from-indigo-400 hover:to-fuchsia-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:opacity-50"
      >
        {loading
          ? isSignUp
            ? "Creating account..."
            : "Signing in..."
          : isSignUp
            ? "Create Account"
            : "Sign In"}
      </button>

      <p className="text-center text-sm text-white/60">
        <Link
          href="/forgot-password"
          className="font-medium text-white/90 hover:text-white hover:underline"
        >
          Forgot password?
        </Link>
      </p>

      {message && (
        <p className="text-center text-sm text-white/80">{message}</p>
      )}
    </form>
  );
}
