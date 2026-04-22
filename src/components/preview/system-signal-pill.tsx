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
  type NetImpact,
} from "@/lib/preview/system-signals";

// ─── Display caps ─────────────────────────────────────────────────────────────
const CRITICAL_CAP = 3;
const IMPORTANT_CAP = 3;

// ─── Root component ───────────────────────────────────────────────────────────
export function SystemSignalPill() {
  const { selectedId, ready } = useSelectedPreviewClient();
  const { current, history, dismiss, clearHistory } = useSystemSignals(
    ready ? selectedId : null,
  );
  const [panelOpen, setPanelOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPanelOpen(false);
    };
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

  const headline = current ? formatPillHeadline(current) : null;
  const hasContent = !!(current || history.length > 0);

  return (
    <div
      ref={containerRef}
      aria-live="polite"
      className="print-hide pointer-events-none fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2 sm:bottom-6 sm:right-6"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {panelOpen && (
        <div className="pointer-events-auto w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-xl border border-indigo-300 bg-white shadow-[0_0_0_1px_rgba(79,70,229,0.18),0_14px_44px_-14px_rgba(79,70,229,0.35),0_0_28px_-6px_rgba(99,102,241,0.45)] sm:max-w-[380px]">
          <KeyChangesPanel
            latest={current}
            history={history}
            onClose={() => {
              setPanelOpen(false);
              dismiss();
            }}
            onClear={clearHistory}
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          if (hasContent) setPanelOpen((o) => !o);
        }}
        className={`pointer-events-auto inline-flex max-w-[92vw] items-center gap-2 rounded-full border border-indigo-300 bg-white px-4 py-2 text-[13px] font-semibold text-slate-900 shadow-[0_0_0_1px_rgba(79,70,229,0.15),0_6px_20px_-4px_rgba(79,70,229,0.3),0_0_20px_-4px_rgba(99,102,241,0.4)] transition-all duration-300 hover:border-indigo-400 hover:shadow-[0_0_0_1px_rgba(79,70,229,0.22),0_8px_26px_-4px_rgba(79,70,229,0.42),0_0_26px_-4px_rgba(99,102,241,0.55)] ${
          current
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-2 opacity-0"
        }`}
        aria-label={panelOpen ? "Close key changes" : "Open key changes"}
        aria-expanded={panelOpen}
      >
        <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-600" />
        </span>
        <span className="truncate">{headline ?? ""}</span>
        <span
          aria-hidden
          className={`text-indigo-500 transition-transform duration-200 ${panelOpen ? "rotate-90" : ""}`}
        >
          ›
        </span>
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
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-600" />
          </span>
          <span className="text-[13px] font-semibold text-slate-900">
            Key changes
          </span>
        </div>
        <div className="flex items-center gap-3">
          {history.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="text-[11px] font-medium text-slate-500 transition-colors hover:text-slate-800"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close key changes"
            className="text-slate-400 transition-colors hover:text-slate-700"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="max-h-[60vh] overflow-y-auto px-4 py-3 sm:max-h-[70vh]">
        {primary ? (
          <BatchBody batch={primary} />
        ) : (
          <p className="text-[12px] text-slate-500">No changes yet.</p>
        )}

        {olderHistory.length > 0 && (
          <div className="mt-4 space-y-3 border-t border-slate-100 pt-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Prior
            </p>
            {olderHistory.slice(0, 3).map((b) => (
              <div
                key={b.id}
                className="rounded-lg border border-slate-100 bg-slate-50/60 p-3"
              >
                <p className="mb-2 text-[10px] font-medium text-slate-400">
                  {new Date(b.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
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
function BatchBody({
  batch,
  compact = false,
}: {
  batch: KeyChangesBatch;
  compact?: boolean;
}) {
  // Don't let supporting items restate the primary insight verbatim.
  const primary = batch.primaryInsight.trim().toLowerCase();
  const filtered = batch.changes.filter(
    (c) => c.headline.trim().toLowerCase() !== primary,
  );
  const critical = filtered
    .filter((c) => c.severity === "critical")
    .slice(0, CRITICAL_CAP);
  const important = filtered
    .filter((c) => c.severity === "important")
    .slice(0, IMPORTANT_CAP);

  return (
    <div className="space-y-3">
      {!compact && (
        <NetImpactBlock impact={batch.netImpact} />
      )}

      {!compact && batch.primaryInsight && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2.5">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-indigo-700">
            Primary insight
          </p>
          <p className="text-[13px] font-semibold leading-snug text-slate-900">
            {batch.primaryInsight}
          </p>
        </div>
      )}

      {critical.length > 0 && (
        <Section label="Critical" dotClass="bg-rose-500">
          {critical.map((c, i) => (
            <ChangeCard key={c.id} change={c} rank={i + 1} />
          ))}
        </Section>
      )}

      {important.length > 0 && (
        <Section label="Important" dotClass="bg-amber-500">
          {important.map((c, i) => (
            <ChangeCard key={c.id} change={c} rank={critical.length + i + 1} />
          ))}
        </Section>
      )}

      {batch.hasMore && !compact && (
        <p className="text-[11px] text-slate-500">
          + additional changes — expand this section to view all
        </p>
      )}

      {batch.confidenceShift && !compact && (
        <ConfidenceBlock shift={batch.confidenceShift} />
      )}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({
  label,
  dotClass,
  children,
}: {
  label: string;
  dotClass: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotClass}`} />
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {label}
        </p>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

// ─── Change card ──────────────────────────────────────────────────────────────
function ChangeCard({ change, rank }: { change: KeyChange; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails =
    (change.supporting_items?.length ?? 0) > 0 || !!change.reason;

  return (
    <div className="rounded-lg border border-slate-300 bg-white p-3 shadow-sm">
      <div className="mb-1.5 flex items-center gap-1.5">
        <LifecycleBadge lifecycle={change.lifecycle} />
        <span className="text-[10px] font-semibold text-slate-500">
          #{rank}
        </span>
        {change.dimension && (
          <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {DIMENSION_SHORT_LABEL[change.dimension]}
          </span>
        )}
      </div>

      <p className="text-[13px] font-semibold leading-snug text-slate-900">
        {change.direction && (
          <span
            className={`mr-1 ${
              change.direction === "up" ? "text-emerald-600" : "text-amber-600"
            }`}
            aria-hidden
          >
            {change.direction === "up" ? "↑" : "↓"}
          </span>
        )}
        {change.headline}
      </p>

      <p className="mt-1 text-[12px] leading-snug text-slate-700">
        <span className="text-slate-500">→ </span>
        {change.implication}
      </p>

      {hasDetails && (
        <>
          <button
            type="button"
            onClick={() => setExpanded((o) => !o)}
            aria-expanded={expanded}
            className="mt-2 inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 transition-colors hover:border-indigo-300 hover:bg-indigo-100"
          >
            <span
              aria-hidden
              className={`transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
            >
              ›
            </span>
            {expanded ? "Hide rationale" : "View rationale"}
          </button>
          {expanded && (
            <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">
              {change.reason && (
                <p className="text-[11px] leading-snug text-slate-600">
                  <span className="font-medium text-slate-500">Source:</span>{" "}
                  {change.evidence_source} — {change.reason}
                </p>
              )}
              {(change.supporting_items ?? []).map((item, i) => (
                <p key={i} className="text-[11px] leading-snug text-slate-700">
                  <span className="text-slate-400">· </span>
                  {item}
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
    new: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    updated: "bg-amber-50 text-amber-700 ring-amber-200",
    resolved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  };
  return (
    <span
      className={`rounded px-1.5 py-[1px] text-[9px] font-semibold uppercase tracking-wider ring-1 ring-inset ${styles[lifecycle]}`}
    >
      {lifecycle}
    </span>
  );
}

// ─── Confidence shift block ───────────────────────────────────────────────────
function ConfidenceBlock({ shift }: { shift: ConfidenceShift }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Confidence
      </p>
      <p className="text-[13px] font-semibold text-slate-900">
        <span
          className={`mr-1 ${
            shift.direction === "up" ? "text-emerald-600" : "text-amber-600"
          }`}
        >
          {shift.direction === "up" ? "↑" : "↓"}
        </span>
        {shift.headline}
      </p>
      <p className="mt-0.5 text-[12px] leading-snug text-slate-600">
        {shift.reason}
      </p>
    </div>
  );
}

// ─── Net impact block ─────────────────────────────────────────────────────────
function NetImpactBlock({ impact }: { impact: NetImpact }) {
  const { direction, confidence, note } = impact;
  const label =
    direction === "up"   ? "Improved"
  : direction === "down" ? "Increased risk"
  :                        "Mixed";
  const arrow =
    direction === "up"   ? "↑"
  : direction === "down" ? "↓"
  :                        "↔";
  const arrowClass =
    direction === "up"   ? "text-emerald-600"
  : direction === "down" ? "text-rose-600"
  :                        "text-slate-500";
  const confDotClass =
    confidence === "high"     ? "bg-emerald-500"
  : confidence === "moderate" ? "bg-amber-500"
  :                             "bg-slate-400";

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Overall impact
        </span>
        <span className={`text-[15px] font-bold leading-none ${arrowClass}`} aria-hidden>
          {arrow}
        </span>
        <span className="text-[13px] font-semibold text-slate-900">{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${confDotClass}`} aria-hidden />
        <span className="text-[11px] font-medium text-slate-600">
          {confidence} confidence
          {note ? <span className="text-slate-400"> · {note}</span> : null}
        </span>
      </div>
    </div>
  );
}
