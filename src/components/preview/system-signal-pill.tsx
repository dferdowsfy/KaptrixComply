"use client";

import { useEffect, useRef, useState } from "react";
import { useSelectedPreviewClient } from "@/hooks/use-selected-preview-client";
import { useSystemSignals } from "@/hooks/use-system-signals";
import {
  DIMENSION_SHORT_LABEL,
  formatPillHeadline,
  type ConfidenceShift,
  type KeyChange,
  type KeyChangesBatch,
} from "@/lib/preview/system-signals";

// ─── Display caps ─────────────────────────────────────────────────────────────
const CRITICAL_CAP  = 3;
const IMPORTANT_CAP = 3;

// ─── Root component ───────────────────────────────────────────────────────────
export function SystemSignalPill() {
  const { selectedId, ready } = useSelectedPreviewClient();
  const { current, history, dismiss, clearHistory } = useSystemSignals(
    ready ? selectedId : null,
  );
  const [panelOpen, setPanelOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dismiss panel on Escape or outside click
  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPanelOpen(false); };
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [panelOpen]);

  const headline   = current ? formatPillHeadline(current) : null;
  const hasContent = !!(current || history.length > 0);

  return (
    <div
      ref={containerRef}
      aria-live="polite"
      className="print-hide pointer-events-none fixed inset-x-0 bottom-4 z-40 flex flex-col items-center gap-2 sm:bottom-6"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Floating panel — anchored above pill, no overlay */}
      {panelOpen && (
        <div className="pointer-events-auto w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-[0_16px_48px_-16px_rgba(0,0,0,0.85)] ring-1 ring-white/5 sm:max-w-md">
          <KeyChangesPanel
            latest={current}
            history={history}
            onClose={() => { setPanelOpen(false); dismiss(); }}
            onClear={clearHistory}
          />
        </div>
      )}

      {/* Compact pill */}
      <button
        type="button"
        onClick={() => { if (hasContent) setPanelOpen((o) => !o); }}
        className={`pointer-events-auto inline-flex max-w-[92vw] items-center gap-2 rounded-full border border-emerald-400/30 bg-slate-950/90 px-3.5 py-1.5 text-[11px] font-semibold text-emerald-100 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)] ring-1 ring-white/5 backdrop-blur transition-all duration-300 ${
          current
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-2 opacity-0"
        }`}
        aria-label={panelOpen ? "Close key changes" : "Open key changes"}
        aria-expanded={panelOpen}
      >
        <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <span className="truncate font-mono tracking-tight">{headline ?? ""}</span>
        <span
          aria-hidden
          className={`text-emerald-300/70 transition-transform duration-200 ${panelOpen ? "rotate-90" : ""}`}
        >›</span>
      </button>
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────
function KeyChangesPanel({
  latest,
  history,
  onClose,
  onClear,
}: {
  latest: KeyChangesBatch | null;
  history: KeyChangesBatch[];
  onClose: () => void;
  onClear: () => void;
}) {
  const primary = latest ?? history[0] ?? null;
  const olderHistory = latest
    ? history.filter((b) => b.id !== latest.id)
    : history.slice(1);

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-300">
            Key Changes
          </span>
        </div>
        <div className="flex items-center gap-3">
          {history.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="font-mono text-[9px] font-semibold uppercase tracking-widest text-slate-500 transition-colors hover:text-slate-300"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close key changes"
            className="text-slate-500 transition-colors hover:text-slate-200"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="max-h-[60vh] overflow-y-auto px-4 py-3 sm:max-h-[70vh]">
        {primary ? (
          <BatchBody batch={primary} />
        ) : (
          <p className="font-mono text-[11px] text-slate-500">No changes yet.</p>
        )}

        {olderHistory.length > 0 && (
          <div className="mt-4 space-y-3 border-t border-white/5 pt-3">
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-600">
              Prior
            </p>
            {olderHistory.slice(0, 3).map((b) => (
              <div key={b.id} className="rounded-lg border border-white/5 bg-slate-900/50 p-3">
                <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-600">
                  {new Date(b.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </p>
                <BatchBody batch={b} compact />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Batch body ───────────────────────────────────────────────────────────────
function BatchBody({ batch, compact = false }: { batch: KeyChangesBatch; compact?: boolean }) {
  const critical  = batch.changes.filter((c) => c.severity === "critical").slice(0, CRITICAL_CAP);
  const important = batch.changes.filter((c) => c.severity === "important").slice(0, IMPORTANT_CAP);

  return (
    <div className="space-y-3">
      {/* Primary Insight */}
      {!compact && batch.primaryInsight && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/30 px-3 py-2">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400 mb-1">
            Primary Insight
          </p>
          <p className="text-[12px] font-semibold leading-snug text-slate-100">
            {batch.primaryInsight}
          </p>
        </div>
      )}

      {/* Critical section */}
      {critical.length > 0 && (
        <Section label="Critical" labelClass="text-rose-400">
          {critical.map((c, i) => (
            <ChangeCard key={c.id} change={c} rank={i + 1} />
          ))}
        </Section>
      )}

      {/* Important section */}
      {important.length > 0 && (
        <Section label="Important" labelClass="text-amber-400">
          {important.map((c, i) => (
            <ChangeCard key={c.id} change={c} rank={critical.length + i + 1} />
          ))}
        </Section>
      )}

      {/* View all overflow */}
      {batch.hasMore && !compact && (
        <p className="font-mono text-[10px] text-slate-500">
          + additional changes — expand this section to view all
        </p>
      )}

      {/* Confidence Shift */}
      {batch.confidenceShift && !compact && (
        <ConfidenceBlock shift={batch.confidenceShift} />
      )}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({
  label,
  labelClass,
  children,
}: {
  label: string;
  labelClass: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className={`font-mono text-[9px] font-semibold uppercase tracking-[0.24em] ${labelClass}`}>
        {label}
      </p>
      {children}
    </div>
  );
}

// ─── Change card ──────────────────────────────────────────────────────────────
function ChangeCard({ change, rank }: { change: KeyChange; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails =
    (change.supporting_items?.length ?? 0) > 0 || !!change.reason;

  return (
    <div className="rounded-lg border border-white/5 bg-slate-900/50 p-2.5">
      {/* Top row: lifecycle tag + priority badge */}
      <div className="mb-1.5 flex items-center gap-1.5">
        <LifecycleBadge lifecycle={change.lifecycle} />
        <span className="font-mono text-[9px] font-semibold text-slate-600">
          #{rank}
        </span>
        {change.dimension && (
          <span className="truncate font-mono text-[9px] uppercase tracking-wider text-slate-600">
            {DIMENSION_SHORT_LABEL[change.dimension]}
          </span>
        )}
      </div>

      {/* Headline */}
      <p className="text-[12px] font-semibold leading-snug text-slate-100">
        {change.direction && (
          <span
            className={`mr-1 ${change.direction === "up" ? "text-emerald-400" : "text-amber-400"}`}
            aria-hidden
          >
            {change.direction === "up" ? "↑" : "↓"}
          </span>
        )}
        {change.headline}
      </p>

      {/* Investment implication */}
      <p className="mt-1 text-[11px] leading-snug text-slate-400">
        <span className="text-slate-600">→ </span>{change.implication}
      </p>

      {/* Drill-down */}
      {hasDetails && (
        <>
          <button
            type="button"
            onClick={() => setExpanded((o) => !o)}
            className="mt-1.5 font-mono text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
          >
            {expanded ? "− Less" : "+ Evidence"}
          </button>
          {expanded && (
            <div className="mt-2 space-y-1 border-t border-white/5 pt-2">
              {change.reason && (
                <p className="font-mono text-[10px] text-slate-400">
                  <span className="text-slate-600">Source: </span>
                  {change.evidence_source} — {change.reason}
                </p>
              )}
              {(change.supporting_items ?? []).map((item, i) => (
                <p key={i} className="font-mono text-[10px] text-slate-300">
                  <span className="text-slate-600">· </span>{item}
                </p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Lifecycle badge ──────────────────────────────────────────────────────────
function LifecycleBadge({ lifecycle }: { lifecycle: KeyChange["lifecycle"] }) {
  const styles: Record<typeof lifecycle, string> = {
    new:      "bg-emerald-500/15 text-emerald-300 ring-emerald-500/20",
    updated:  "bg-amber-500/15 text-amber-300 ring-amber-500/20",
    resolved: "bg-slate-500/15 text-slate-400 ring-slate-500/20",
  };
  return (
    <span
      className={`rounded px-1.5 py-[1px] font-mono text-[9px] font-semibold uppercase tracking-wider ring-1 ${styles[lifecycle]}`}
    >
      {lifecycle}
    </span>
  );
}

// ─── Confidence shift block ───────────────────────────────────────────────────
function ConfidenceBlock({ shift }: { shift: ConfidenceShift }) {
  return (
    <div className="rounded-lg border border-white/5 bg-slate-900/40 p-2.5">
      <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500 mb-1">
        Confidence
      </p>
      <p className="text-[12px] font-semibold text-slate-100">
        <span
          className={`mr-1 ${shift.direction === "up" ? "text-emerald-400" : "text-amber-400"}`}
        >
          {shift.direction === "up" ? "↑" : "↓"}
        </span>
        {shift.headline}
      </p>
      <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{shift.reason}</p>
    </div>
  );
}


// System-terminal notification: fires whenever the knowledge base
// recalibrates the scoring model. Details appear in a floating panel
// anchored above the pill — no overlay, page stays fully interactive.
