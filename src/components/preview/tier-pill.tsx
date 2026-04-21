"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type UsageView = {
  tier: "starter" | "professional" | "institutional";
  tier_label: string;
  limits: {
    max_engagements: number;
    max_reports_per_month: number;
    max_ai_queries_per_month: number;
  };
  usage: {
    reports_generated: number;
    ai_queries: number;
    active_engagements: number;
  };
  remaining: {
    engagements: number | null;
    reports: number | null;
    ai_queries: number | null;
  };
};

const TIER_STYLES: Record<string, string> = {
  starter:
    "border-slate-300 bg-white/10 text-slate-100 hover:bg-white/20",
  professional:
    "border-indigo-300 bg-indigo-500/20 text-indigo-100 hover:bg-indigo-500/30",
  institutional:
    "border-amber-300 bg-amber-500/20 text-amber-100 hover:bg-amber-500/30",
};

/**
 * Small pill shown in the dashboard header with the user's current
 * plan. Clicking it opens the Account → Plan page.
 */
export function TierPill() {
  const [usage, setUsage] = useState<UsageView | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/usage")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.tier) setUsage(data as UsageView);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!usage) return null;

  const style =
    TIER_STYLES[usage.tier] ?? TIER_STYLES.starter;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition ${style}`}
        title="View plan & usage"
      >
        {usage.tier_label}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 text-slate-900 shadow-xl"
          onMouseLeave={() => setOpen(false)}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Current plan
          </p>
          <p className="mt-0.5 text-sm font-semibold">{usage.tier_label}</p>

          <div className="mt-3 space-y-2">
            <Meter
              label="Engagements"
              used={usage.usage.active_engagements}
              remaining={usage.remaining.engagements}
              cap={usage.limits.max_engagements}
            />
            <Meter
              label="Reports this month"
              used={usage.usage.reports_generated}
              remaining={usage.remaining.reports}
              cap={usage.limits.max_reports_per_month}
            />
            <Meter
              label="AI queries this month"
              used={usage.usage.ai_queries}
              remaining={usage.remaining.ai_queries}
              cap={usage.limits.max_ai_queries_per_month}
            />
          </div>

          <Link
            href="/account"
            className="mt-3 block rounded-md bg-slate-900 px-2.5 py-1.5 text-center text-xs font-semibold text-white hover:bg-slate-700"
            onClick={() => setOpen(false)}
          >
            View plan & billing
          </Link>
        </div>
      )}
    </div>
  );
}

function Meter({
  label,
  used,
  remaining,
  cap,
}: {
  label: string;
  used: number;
  remaining: number | null;
  cap: number;
}) {
  const unlimited = cap < 0;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(1, cap)) * 100));
  const barColor =
    pct >= 90 ? "bg-rose-500" : pct >= 70 ? "bg-amber-500" : "bg-indigo-500";
  return (
    <div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium text-slate-800">
          {unlimited ? "Unlimited" : `${used} / ${cap}`}
        </span>
      </div>
      {!unlimited && (
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {!unlimited && remaining !== null && remaining <= Math.max(1, Math.floor(cap * 0.1)) && (
        <p className="mt-1 text-[10px] text-amber-700">
          {remaining === 0 ? "Limit reached" : `${remaining} left`}
        </p>
      )}
    </div>
  );
}
