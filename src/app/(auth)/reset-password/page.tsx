"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!isSupabaseConfigured()) {
      setError(
        "Supabase is not configured yet. Configure env vars to enable password reset.",
      );
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setError(
        updateError.message ||
          "Unable to reset password. Use your reset link again and retry.",
      );
      setLoading(false);
      return;
    }

    setMessage("Password updated successfully. You can now sign in.");
    setNewPassword("");
    setConfirmPassword("");
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-indigo-200/80">
          Secure update
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
          Reset password
        </h2>
        <p className="mt-2 text-sm text-white/60">
          Choose a new password for your Kaptrix account.
        </p>
      </div>

      <div>
        <label htmlFor="new-password" className="block text-sm font-medium text-white/80">
          New password
        </label>
        <input
          id="new-password"
          type="password"
          required
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white shadow-sm placeholder:text-white/40 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
          placeholder="••••••••"
        />
      </div>

      <div>
        <label htmlFor="confirm-password" className="block text-sm font-medium text-white/80">
          Confirm password
        </label>
        <input
          id="confirm-password"
          type="password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white shadow-sm placeholder:text-white/40 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex w-full justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/30 transition hover:from-indigo-400 hover:to-fuchsia-400 disabled:opacity-60"
      >
        {loading ? "Updating..." : "Update password"}
      </button>

      {message && <p className="text-center text-sm text-emerald-300">{message}</p>}
      {error && <p className="text-center text-sm text-rose-300">{error}</p>}

      <p className="text-center text-sm text-white/60">
        <Link href="/login" className="font-medium text-white/90 hover:text-white hover:underline">
          Back to log in
        </Link>
      </p>
    </form>
  );
}
