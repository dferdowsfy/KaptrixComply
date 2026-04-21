"use client";

import { useEffect, useRef, useState } from "react";
import { useSelectedPreviewClient } from "@/hooks/use-selected-preview-client";
import { useSystemSignals } from "@/hooks/use-system-signals";
import {
  DIMENSION_SHORT_LABEL,
  formatHeadline,
  type SystemSignalBatch,
} from "@/lib/preview/system-signals";

// System-terminal notification: fires whenever the knowledge base
// recalibrates the scoring model. Details appear in a floating panel
// anchored above the pill — no overlay, page stays fully interactive.
export function SystemSignalPill() {
  const { selectedId, ready } = useSelectedPreviewClient();
  const { current, history, dismiss, clearHistory } = useSystemSignals(
    ready ? selectedId : null,
  );
  const [panelOpen, setPanelOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dismiss on Escape or outside click.
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

  const headline = current ? formatHeadline(current) : null;
  const hasContent = !!(current || history.length > 0);

  return (
    <div
      ref={containerRef}
      aria-live="polite"
      className="print-hide pointer-events-none fixed inset-x-0 bottom-4 z-40 flex flex-col items-center gap-2 sm:bottom-6"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Floating detail panel — appears above the pill, no backdrop */}
      {panelOpen && (
        <div className="pointer-events-auto w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-white/10 bg-slate-950 shadow-[0_16px_48px_-16px_rgba(0,0,0,0.8)] ring-1 ring-white/5 sm:max-w-md">
          <DetailPanel
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
        aria-label={panelOpen ? "Close system updates" : "Open system updates"}
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

function DetailPanel({
  latest,
  history,
  onClose,
  onClear,
}: {
  latest: SystemSignalBatch | null;
  history: SystemSignalBatch[];
  onClose: () => void;
  onClear: () => void;
}) {
  const primary = latest ?? history[0] ?? null;
  const olderHistory = latest
    ? history.filter((b) => b.id !== latest.id)
    : history.slice(1);

  return (
    <>
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-300">
            System Update
          </span>
        </div>
        <div className="flex items-center gap-3">
          {history.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="font-mono text-[9px] font-semibold uppercase tracking-widest text-slate-500 transition-colors hover:text-slate-200"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-slate-500 transition-colors hover:text-slate-200"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto px-4 py-3 sm:max-h-80">
        {primary ? (
          <BatchView batch={primary} showTimestamp={false} />
        ) : (
          <p className="font-mono text-[11px] text-slate-500">No signals yet.</p>
        )}

        {olderHistory.length > 0 && (
          <div className="mt-4 space-y-3 border-t border-white/5 pt-3">
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-600">
              Prior
            </p>
            {olderHistory.slice(0, 4).map((b) => (
              <div key={b.id} className="rounded-lg border border-white/5 bg-slate-900/50 p-2.5">
                <BatchView batch={b} showTimestamp />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function BatchView({
  batch,
  showTimestamp,
}: {
  batch: SystemSignalBatch;
  showTimestamp: boolean;
}) {
  const groups: { title: string; body: React.ReactNode }[] = [];

  if (batch.risks.length > 0) {
    const dims = Array.from(
      new Set(batch.risks.map((r) => DIMENSION_SHORT_LABEL[r.dimension])),
    );
    groups.push({
      title: `Risks Added (${dims.join(", ")})`,
      body: (
        <ul className="mt-1 space-y-1">
          {batch.risks.slice(0, 6).map((r, i) => (
            <li key={i} className="flex items-start gap-2 font-mono text-[11px] text-slate-200">
              <span
                className={`mt-0.5 shrink-0 rounded px-1.5 py-[1px] text-[9px] font-semibold uppercase tracking-wider ${
                  r.severity === "critical"
                    ? "bg-rose-500/20 text-rose-300"
                    : r.severity === "high"
                      ? "bg-amber-500/20 text-amber-200"
                      : "bg-slate-500/20 text-slate-300"
                }`}
              >
                {r.severity}
              </span>
              <span className="leading-snug">{r.label}</span>
            </li>
          ))}
        </ul>
      ),
    });
  }

  if (batch.gaps.length > 0) {
    groups.push({
      title: "Coverage Gaps Added",
      body: (
        <ul className="mt-1 space-y-0.5 font-mono text-[11px] text-slate-200">
          {batch.gaps.slice(0, 6).map((g, i) => (
            <li key={i}>
              <span className="text-slate-600">—</span> Missing: {g.artifact}
            </li>
          ))}
        </ul>
      ),
    });
  }

  if (batch.adjustments.length > 0) {
    groups.push({
      title: "Scoring Model Adjusted",
      body: (
        <ul className="mt-1 space-y-0.5 font-mono text-[11px] text-slate-200">
          {batch.adjustments.slice(0, 6).map((a, i) => (
            <li key={i} className="flex items-baseline gap-1.5 leading-snug">
              {/* Numerical delta — tabular so columns align */}
              <span
                className={`w-10 shrink-0 tabular-nums font-semibold ${
                  a.direction === "up" ? "text-emerald-300" : "text-amber-300"
                }`}
              >
                {a.direction === "up" ? "+" : "−"}{a.delta.toFixed(2)}
              </span>
              <span>{DIMENSION_SHORT_LABEL[a.dimension]}</span>
              <span className="text-[10px] text-slate-600">({a.reason})</span>
            </li>
          ))}
        </ul>
      ),
    });
  }

  if (batch.knowledge.length > 0) {
    const total = batch.knowledge.reduce((s, k) => s + k.count, 0);
    const breakdown = batch.knowledge
      .map((k) => `+${k.count} ${sourceLabel(k.source)}`)
      .join(" · ");
    groups.push({
      title: "Knowledge Base Updated",
      body: (
        <p className="mt-1 font-mono text-[11px] text-slate-200">
          <span className="font-semibold text-emerald-300">+{total}</span>{" "}
          signal{total === 1 ? "" : "s"}{" "}
          <span className="text-slate-500">— {breakdown}</span>
        </p>
      ),
    });
  }

  return (
    <div className="space-y-3">
      {showTimestamp && (
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-600">
          {new Date(batch.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </p>
      )}
      {groups.slice(0, 5).map((g, i) => (
        <div key={i}>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400">
            • {g.title}
          </p>
          {g.body}
        </div>
      ))}
    </div>
  );
}

function sourceLabel(
  src: "intake" | "coverage" | "insights" | "pre_analysis" | "positioning",
): string {
  switch (src) {
    case "intake":       return "intake";
    case "coverage":     return "coverage";
    case "insights":     return "prior artifacts";
    case "pre_analysis": return "pre-analysis";
    case "positioning":  return "positioning";
  }
}
