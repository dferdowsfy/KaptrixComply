"use client";

import { useEffect, useRef } from "react";
import {
  submitToKnowledgeBase,
  type KnowledgeEntry,
  type KnowledgePayload,
  type KnowledgeStep,
} from "@/lib/preview/knowledge-base";
import { useSelectedPreviewClient } from "@/hooks/use-selected-preview-client";

interface Props {
  step: KnowledgeStep;
  /** Called to construct the structured snapshot for this step. */
  buildPayload: () => { payload: KnowledgePayload; summary: string };
  /** Optional disable reason — when set, auto-sync is paused. */
  disabledReason?: string | null;
}

/**
 * Headless auto-sync: writes the latest snapshot for this step into the
 * per-client knowledge base whenever the payload signature changes.
 * Status is surfaced via the header KB activity indicator.
 */
export function SubmitToKnowledgeBase({
  step,
  buildPayload,
  disabledReason,
}: Props) {
  const { selectedId } = useSelectedPreviewClient();
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
  }, [selectedId, step, disabledReason, buildPayload]);

  return null;
}
