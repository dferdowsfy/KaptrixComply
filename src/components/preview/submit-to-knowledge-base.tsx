"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  KNOWLEDGE_STEP_LABELS,
  readClientKb,
  submitToKnowledgeBase,
  subscribeKnowledgeBase,
  type KnowledgeEntry,
  type KnowledgePayload,
  type KnowledgeStep,
} from "@/lib/preview/knowledge-base";
import { useSelectedPreviewClient } from "@/hooks/use-selected-preview-client";

interface Props {
  step: KnowledgeStep;
  /** Called to construct the structured snapshot for this step. */
  buildPayload: () => { payload: KnowledgePayload; summary: string };
  /** Optional disable reason shown to the operator. */
  disabledReason?: string | null;
}

/**
 * Shared submit control that captures a structured snapshot of the
 * current step into the per-client knowledge base. Downstream steps
 * (notably scoring) read the KB to factor context into decisions.
 */
export function SubmitToKnowledgeBase({
  step,
  buildPayload,
  disabledReason,
}: Props) {
  const { selectedId } = useSelectedPreviewClient();

  const entries = useSyncExternalStore(
    subscribeKnowledgeBase,
    () => readClientKb(selectedId),
    () => ({}) as Partial<Record<KnowledgeStep, KnowledgeEntry>>,
  );
  const existing = entries[step];

  const [justSynced, setJustSynced] = useState(false);
  const lastSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedId || disabledReason) return;

    const { payload, summary } = buildPayload();
    const signature = JSON.stringify({ step, summary, payload });
    if (signature === lastSignatureRef.current) return;

    const entry: KnowledgeEntry = {
      step,
      submitted_at: new Date().toISOString(),
      summary,
      payload,
    };

    submitToKnowledgeBase(selectedId, entry);
    lastSignatureRef.current = signature;
    setJustSynced(true);
    window.setTimeout(() => setJustSynced(false), 1600);
  }, [selectedId, step, disabledReason, buildPayload]);

  const label = KNOWLEDGE_STEP_LABELS[step];
  const disabled = Boolean(disabledReason);

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-800">
          {label} auto-sync to knowledge base
        </p>
        <p className="mt-1 text-xs text-indigo-900/80">
          This step is automatically synchronized to the client&apos;s knowledge
          base. Scoring, positioning, and chat use the latest synced context.
        </p>
        {existing && !justSynced && (
          <p className="mt-1 text-[11px] text-indigo-700">
            Last synced{" "}
            {new Date(existing.submitted_at).toLocaleString()} —{" "}
            <span className="italic">{existing.summary}</span>
          </p>
        )}
        {justSynced && (
          <p className="mt-1 text-[11px] font-medium text-emerald-700">
            Synced to knowledge base.
          </p>
        )}
        {disabled && (
          <p className="mt-1 text-[11px] text-amber-700">{disabledReason}</p>
        )}
      </div>
    </div>
  );
}
