"use client";

import { useEffect, useState } from "react";

type Status = { supabase: boolean; gemini: boolean } | null;

export function ConnectionStatus() {
  const [status, setStatus] = useState<Status>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/preview/status", { cache: "no-store" });
        if (!cancelled && res.ok) {
          setStatus(await res.json());
        }
      } catch {
        if (!cancelled) setStatus({ supabase: false, gemini: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!status) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-500 sm:px-4 sm:py-2 sm:text-sm">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-slate-400" />
        Checking connections…
      </div>
    );
  }

  const allGood = status.supabase && status.gemini;

  return (
    <div
      className={`inline-flex items-center gap-3 rounded-full border px-3 py-1.5 text-xs font-medium sm:px-4 sm:py-2 sm:text-sm ${
        allGood
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-amber-200 bg-amber-50 text-amber-800"
      }`}
    >
      <span className="flex items-center gap-1.5">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            status.supabase ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" : "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]"
          }`}
        />
        Supabase
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            status.gemini ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" : "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]"
          }`}
        />
        Gemini
      </span>
    </div>
  );
}
