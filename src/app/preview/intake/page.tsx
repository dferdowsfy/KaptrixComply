"use client";

import { useCallback, useSyncExternalStore } from "react";
import { IntakeQuestionnaire } from "@/components/engagements/intake-questionnaire";
import { SectionHeader } from "@/components/preview/preview-shell";
import { SubmitToKnowledgeBase } from "@/components/preview/submit-to-knowledge-base";
import {
  PREVIEW_INTAKE_STORAGE_KEY,
  type PreviewAnswers,
} from "@/lib/preview-intake";
import type { IntakePayload } from "@/lib/preview/knowledge-base";

const STORAGE_EVENT = "kaptrix:preview-intake-change";
const EMPTY_PREVIEW_ANSWERS: PreviewAnswers = {};

let cachedPreviewAnswersRaw: string | null | undefined;
let cachedPreviewAnswers: PreviewAnswers = EMPTY_PREVIEW_ANSWERS;

function readPreviewAnswers(): PreviewAnswers {
  if (typeof window === "undefined") return EMPTY_PREVIEW_ANSWERS;

  try {
    const raw = window.localStorage.getItem(PREVIEW_INTAKE_STORAGE_KEY);
    if (raw === cachedPreviewAnswersRaw) return cachedPreviewAnswers;

    cachedPreviewAnswersRaw = raw;
    cachedPreviewAnswers = raw
      ? (JSON.parse(raw) as PreviewAnswers)
      : EMPTY_PREVIEW_ANSWERS;

    return cachedPreviewAnswers;
  } catch {
    cachedPreviewAnswersRaw = null;
    cachedPreviewAnswers = EMPTY_PREVIEW_ANSWERS;
    return cachedPreviewAnswers;
  }
}

function subscribeToPreviewAnswers(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== PREVIEW_INTAKE_STORAGE_KEY) return;
    callback();
  };
  const handleLocalChange = () => callback();

  window.addEventListener("storage", handleStorage);
  window.addEventListener(STORAGE_EVENT, handleLocalChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(STORAGE_EVENT, handleLocalChange);
  };
}

function notifyPreviewAnswersChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export default function PreviewIntakePage() {
  const answers = useSyncExternalStore(
    subscribeToPreviewAnswers,
    readPreviewAnswers,
    () => EMPTY_PREVIEW_ANSWERS,
  );

  const handleChange = (next: PreviewAnswers) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PREVIEW_INTAKE_STORAGE_KEY, JSON.stringify(next));
    notifyPreviewAnswersChanged();
  };

  const buildIntakePayload = useCallback(() => {
    const asArray = (v: PreviewAnswers[string] | undefined): string[] =>
      Array.isArray(v) ? v.map(String) : v ? [String(v)] : [];

    const regulatory_exposure = asArray(answers["regulatory_exposure"]);
    const diligence_priorities = asArray(answers["diligence_priorities"]);
    const red_flag_priors = asArray(answers["red_flag_priors"]);
    const answered_fields = Object.values(answers).filter((v) =>
      Array.isArray(v) ? v.length > 0 : v !== "" && v !== null && v !== undefined,
    ).length;

    const payload: IntakePayload = {
      kind: "intake",
      answered_fields,
      regulatory_exposure,
      diligence_priorities,
      red_flag_priors,
    };
    const summary = `${answered_fields} fields · ${regulatory_exposure.length} regulatory · ${red_flag_priors.length} prior flags`;
    return { payload, summary };
  }, [answers]);

  const disabledReason =
    Object.keys(answers).length === 0
      ? "Answer at least one intake question before submitting."
      : null;

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Module 1"
        title="Guided intake questionnaire"
        description="Comprehensive intake with industry-specific depth, preselected options, and optional free-form context at each prompt to build stronger platform intelligence."
      />
      <IntakeQuestionnaire initialAnswers={answers} onChange={handleChange} />
      <SubmitToKnowledgeBase
        step="intake"
        buildPayload={buildIntakePayload}
        disabledReason={disabledReason}
      />
    </div>
  );
}
