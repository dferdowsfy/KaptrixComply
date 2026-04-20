"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!isSupabaseConfigured()) {
      setError(
        "Supabase is not configured yet. Configure env vars to enable password recovery.",
      );
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(
      /\/$/, "",
    );
    const siteUrl =
      configuredSiteUrl ||
      (process.env.NODE_ENV === "development" ? window.location.origin : "");

    if (!siteUrl) {
      setError(
        "Reset link destination is not configured. Set NEXT_PUBLIC_SITE_URL to your production domain.",
      );
      setLoading(false);
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${siteUrl}/reset-password`,
      },
    );

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setMessage("Password reset link sent. Check your inbox and spam folder.");
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-indigo-200/80">
          Account recovery
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
          Forgot your password?
        </h2>
        <p className="mt-2 text-sm text-white/60">
          Enter your email and we&apos;ll send you a secure reset link.
        </p>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-white/80">
          Email address
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white shadow-sm placeholder:text-white/40 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
          placeholder="operator@kaptrix.com"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex w-full justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/30 transition hover:from-indigo-400 hover:to-fuchsia-400 disabled:opacity-60"
      >
        {loading ? "Sending..." : "Send reset link"}
      </button>

      {message && <p className="text-center text-sm text-emerald-300">{message}</p>}
      {error && <p className="text-center text-sm text-rose-300">{error}</p>}

      <p className="text-center text-sm text-white/60">
        Remembered your password?{" "}
        <Link href="/login" className="font-medium text-white/90 hover:text-white hover:underline">
          Back to log in
        </Link>
      </p>
    </form>
  );
}
