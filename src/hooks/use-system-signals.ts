"use client";

import { useEffect, useRef, useState } from "react";
import {
  readClientKb,
  subscribeKnowledgeBase,
} from "@/lib/preview/knowledge-base";
import {
  buildKeyChangesBatch,
  type ClientKb,
  type KeyChange,
  type KeyChangesBatch,
} from "@/lib/preview/system-signals";

const EMPTY_KB: ClientKb = {};
const MAX_HISTORY        = 10;
/** Wait for inactivity before emitting — prevents per-keystroke updates */
const DEBOUNCE_MS        = 1200;
/** Auto-dismiss the pill after this duration */
const PILL_DISMISS_MS    = 12000;

export interface UseSystemSignalsResult {
  /** Currently visible batch — null when dismissed */
  current: KeyChangesBatch | null;
  /** Rolling session history (most recent first) */
  history: KeyChangesBatch[];
  dismiss: () => void;
  clearHistory: () => void;
}

/**
 * Watches the preview KB for the active client.
 *
 * - Seeds baseline from current KB on first mount → no phantom flash on page load.
 * - Debounces KB changes by DEBOUNCE_MS so rapid input sequences produce a
 *   single insight batch, not per-field noise.
 * - Applies in-session dedup: suppresses re-surfacing the same fingerprint
 *   unless its severity escalated (lifecycle = "updated").
 */
export function useSystemSignals(clientId: string | null | undefined): UseSystemSignalsResult {
  const [current, setCurrent] = useState<KeyChangesBatch | null>(null);
  const [history, setHistory] = useState<KeyChangesBatch[]>([]);

  /** KB snapshot at the time of the last emitted batch */
  const lastEmittedKbRef   = useRef<ClientKb>(EMPTY_KB);
  /** Latest received KB snapshot (may be ahead of lastEmitted) */
  const pendingKbRef       = useRef<ClientKb>(EMPTY_KB);
  const prevClientIdRef    = useRef<string | null | undefined>(undefined);
  const debounceTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * In-session dedup store: fingerprint → { severity, headline }
   * A change is suppressed if the same fingerprint was already shown
   * with the same (or higher) severity. Re-surfaces as "updated" if severity escalated.
   */
  const seenRef = useRef<Map<string, { severity: string; headline: string }>>(new Map());

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Reset on client change
    if (prevClientIdRef.current !== clientId) {
      prevClientIdRef.current = clientId;
      const kb = clientId ? readClientKb(clientId) : EMPTY_KB;
      lastEmittedKbRef.current = kb;
      pendingKbRef.current     = kb;
      seenRef.current.clear();
      setCurrent(null);
      setHistory([]);
      if (debounceTimerRef.current) { clearTimeout(debounceTimerRef.current); debounceTimerRef.current = null; }
      if (dismissTimerRef.current)  { clearTimeout(dismissTimerRef.current);  dismissTimerRef.current  = null; }
    }

    if (!clientId) return;

    const severityRank: Record<string, number> = { critical: 2, important: 1 };

    const processPending = () => {
      const next = pendingKbRef.current;
      const prev = lastEmittedKbRef.current;
      if (next === prev) return;

      const raw = buildKeyChangesBatch(prev, next);
      lastEmittedKbRef.current = next;
      if (!raw) return;

      // Apply in-session dedup — filter/tag changes
      const deduped: KeyChange[] = [];
      for (const change of raw.changes) {
        const prior = seenRef.current.get(change.id);
        if (!prior) {
          // Never seen — surface as "new"
          deduped.push({ ...change, lifecycle: "new" });
          seenRef.current.set(change.id, { severity: change.severity, headline: change.headline });
        } else {
          const priorRank   = severityRank[prior.severity]   ?? 0;
          const currentRank = severityRank[change.severity]  ?? 0;
          if (currentRank > priorRank) {
            // Severity escalated — surface as "updated"
            deduped.push({ ...change, lifecycle: "updated" });
            seenRef.current.set(change.id, { severity: change.severity, headline: change.headline });
          }
          // Otherwise: same or lower severity → suppress (already seen)
        }
      }

      // Always surface resolved gaps (they're intentionally one-time events)
      const resolved = raw.changes.filter((c) => c.lifecycle === "resolved");
      for (const r of resolved) {
        if (!deduped.some((d) => d.id === r.id)) deduped.push(r);
      }

      // If nothing new after dedup, still update confidence shift if present
      if (deduped.length === 0 && !raw.confidenceShift) return;

      const batch: KeyChangesBatch = {
        ...raw,
        changes: deduped,
        hasMore: deduped.filter((c) => c.severity === "critical").length > 3
               || deduped.filter((c) => c.severity === "important").length > 3,
      };

      setCurrent(batch);
      setHistory((h) => [batch, ...h].slice(0, MAX_HISTORY));

      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(() => {
        setCurrent(null);
        dismissTimerRef.current = null;
      }, PILL_DISMISS_MS);
    };

    const handle = () => {
      pendingKbRef.current = readClientKb(clientId);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        processPending();
      }, DEBOUNCE_MS);
    };

    const unsubscribe = subscribeKnowledgeBase(handle);
    return () => {
      unsubscribe();
      if (debounceTimerRef.current) { clearTimeout(debounceTimerRef.current); debounceTimerRef.current = null; }
    };
  }, [clientId]);

  useEffect(() => {
    return () => { if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current); };
  }, []);

  return {
    current,
    history,
    dismiss: () => {
      if (dismissTimerRef.current) { clearTimeout(dismissTimerRef.current); dismissTimerRef.current = null; }
      setCurrent(null);
    },
    clearHistory: () => { setHistory([]); setCurrent(null); },
  };
}
