"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
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
  /** Called lazily when the operator clicks submit. */
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

  const [justSubmitted, setJustSubmitted] = useState(false);

  const onClick = useCallback(() => {
    if (!selectedId) return;
    const { payload, summary } = buildPayload();
    const entry: KnowledgeEntry = {
      step,
      submitted_at: new Date().toISOString(),
      summary,
      payload,
    };
    submitToKnowledgeBase(selectedId, entry);
    setJustSubmitted(true);
    window.setTimeout(() => setJustSubmitted(false), 1800);
  }, [selectedId, step, buildPayload]);

  const label = KNOWLEDGE_STEP_LABELS[step];
  const disabled = Boolean(disabledReason);

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-800">
          Submit {label.toLowerCase()} to knowledge base
        </p>
        <p className="mt-1 text-xs text-indigo-900/80">
          Adds this step&apos;s context to the client&apos;s knowledge base.
          Scoring and the investment recommendation factor in every submitted
          step.
        </p>
        {existing && !justSubmitted && (
          <p className="mt-1 text-[11px] text-indigo-700">
            Last submitted{" "}
            {new Date(existing.submitted_at).toLocaleString()} —{" "}
            <span className="italic">{existing.summary}</span>
          </p>
        )}
        {justSubmitted && (
          <p className="mt-1 text-[11px] font-medium text-emerald-700">
            Submitted to knowledge base.
          </p>
        )}
        {disabled && (
          <p className="mt-1 text-[11px] text-amber-700">{disabledReason}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {existing ? "Resubmit" : "Submit"} to knowledge base
      </button>
    </div>
  );
}
