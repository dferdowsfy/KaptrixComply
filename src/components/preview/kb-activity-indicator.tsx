"use client";

import { useSyncExternalStore } from "react";
import {
  KNOWLEDGE_STEP_LABELS,
  type KnowledgeEntry,
  type KnowledgeStep,
  readClientKb,
  subscribeKnowledgeBase,
} from "@/lib/preview/knowledge-base";
import { useSelectedPreviewClient } from "@/hooks/use-selected-preview-client";

const STEP_ORDER: KnowledgeStep[] = [
  "intake",
  "coverage",
  "insights",
  "pre_analysis",
  "scoring",
  "positioning",
  "chat",
];

const RECENT_WINDOW_MS = 6000;

// Shared ticking store so React stays pure: time advances via an
// external subscription rather than setState inside an effect.
const tickListeners = new Set<() => void>();
let tickValue = typeof window === "undefined" ? 0 : Date.now();
let tickTimer: ReturnType<typeof setInterval> | null = null;

function subscribeTick(cb: () => void): () => void {
  tickListeners.add(cb);
  if (tickTimer === null && typeof window !== "undefined") {
    tickTimer = setInterval(() => {
      tickValue = Date.now();
      tickListeners.forEach((fn) => fn());
    }, 1000);
  }
  return () => {
    tickListeners.delete(cb);
    if (tickListeners.size === 0 && tickTimer !== null) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
  };
}

function getTick(): number {
  return tickValue;
}

export function KbActivityIndicator() {
  const { client, ready } = useSelectedPreviewClient();
  const clientId = ready ? client.id : null;

  const kb = useSyncExternalStore(
    subscribeKnowledgeBase,
    () => readClientKb(clientId),
    () => readClientKb(null),
  );

  // Subscribe to a 1s tick that exposes Date.now() as its snapshot,
  // keeping render pure.
  const now = useSyncExternalStore(subscribeTick, getTick, () => 0);

  const syncedEntries = STEP_ORDER.map((step) => ({ step, entry: kb[step] }));
  const syncedCount = syncedEntries.filter((s) => s.entry).length;

  // Most recently synced step → drives the visible status line.
  const latest = syncedEntries
    .filter((s): s is { step: KnowledgeStep; entry: KnowledgeEntry } => Boolean(s.entry))
    .sort(
      (a, b) =>
        new Date(b.entry.submitted_at).getTime() -
        new Date(a.entry.submitted_at).getTime(),
    )[0];
  const latestAgeMs = latest ? now - new Date(latest.entry.submitted_at).getTime() : Infinity;
  const latestIsRecent = latest && latestAgeMs >= 0 && latestAgeMs < RECENT_WINDOW_MS;

  return (
    <div
      className="inline-flex max-w-full items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur sm:gap-3 sm:px-3.5 sm:py-2"
      title={`${syncedCount} of ${STEP_ORDER.length} workflow steps in the knowledge base for this client`}
    >
      <span className="hidden text-[9px] font-semibold uppercase tracking-[0.22em] text-indigo-200/80 sm:inline">
        Knowledge
      </span>
      <ul className="flex items-center gap-1.5">
        {syncedEntries.map(({ step, entry }) => {
          const isSynced = Boolean(entry);
          const ageMs = entry ? now - new Date(entry.submitted_at).getTime() : Infinity;
          const isRecent = isSynced && ageMs >= 0 && ageMs < RECENT_WINDOW_MS;
          return (
            <li
              key={step}
              className="group relative"
              title={
                entry
                  ? `${KNOWLEDGE_STEP_LABELS[step]} · ${entry.summary}`
                  : `${KNOWLEDGE_STEP_LABELS[step]} · not yet captured`
              }
            >
              <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                {isRecent && (
                  <span
                    aria-hidden
                    className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-70"
                  />
                )}
                <span
                  aria-hidden
                  className={`relative inline-flex h-2 w-2 rounded-full transition ${
                    isRecent
                      ? "bg-emerald-300 shadow-[0_0_6px_rgba(110,231,183,0.7)]"
                      : isSynced
                        ? "bg-indigo-300"
                        : "bg-white/20"
                  }`}
                />
              </span>
              <span className="sr-only">{KNOWLEDGE_STEP_LABELS[step]}</span>
            </li>
          );
        })}
      </ul>
      <span className="text-[10px] font-medium tabular-nums text-indigo-100/80 sm:text-[11px]">
        {syncedCount}/{STEP_ORDER.length}
      </span>
      {latest && (
        <span
          className={`hidden min-w-0 max-w-[260px] truncate border-l border-white/10 pl-2.5 text-[11px] md:inline ${
            latestIsRecent ? "text-emerald-200" : "text-indigo-100/80"
          }`}
          title={latest.entry.summary}
        >
          <span className="font-semibold uppercase tracking-[0.16em] text-indigo-200/70">
            {latestIsRecent ? "Synced" : "Latest"}
          </span>{" "}
          <span className="text-white/90">{KNOWLEDGE_STEP_LABELS[latest.step]}</span>{" "}
          <span className="text-indigo-100/60">· {formatAge(latestAgeMs)}</span>
        </span>
      )}
    </div>
  );
}

function formatAge(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "";
  const s = Math.floor(ms / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
