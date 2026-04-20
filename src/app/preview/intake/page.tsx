"use client";

import { useCallback, useSyncExternalStore } from "react";
import { IntakeQuestionnaire } from "@/components/engagements/intake-questionnaire";
import { SectionHeader } from "@/components/preview/preview-shell";
import { SubmitToKnowledgeBase } from "@/components/preview/submit-to-knowledge-base";
import { useSelectedPreviewClient } from "@/hooks/use-selected-preview-client";
import {
  PREVIEW_INTAKE_STORAGE_KEY,
  getClientIndustry,
  type PreviewAnswers,
} from "@/lib/preview-intake";
import type { IntakePayload } from "@/lib/preview/knowledge-base";
import type { Industry } from "@/lib/industry-requirements";

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
  const { selectedId } = useSelectedPreviewClient();
  const industry: Industry =
    (selectedId ? getClientIndustry(selectedId) : null) ?? "legal_tech";

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
    const asStr = (v: PreviewAnswers[string] | undefined): string | undefined => {
      if (Array.isArray(v)) return v.length ? v.join(", ") : undefined;
      if (v === undefined || v === null || v === "") return undefined;
      return String(v);
    };

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
      engagement_type: asStr(answers["engagement_type"]),
      buyer_archetype: asStr(answers["buyer_archetype"]),
      buyer_industry: asStr(answers["buyer_industry"]),
      target_size_usd: asStr(answers["target_size_usd"]),
      investment_size_usd: asStr(answers["investment_size_usd"]),
      annual_run_rate_usd: asStr(answers["annual_run_rate_usd"]),
      decision_horizon_days: asStr(answers["decision_horizon_days"]),
      deal_thesis: asArray(answers["deal_thesis"]),
      deal_stage: asStr(answers["deal_stage"]),
      internal_sponsor_role: asStr(answers["internal_sponsor_role"]),
      dissenting_voices: asArray(answers["dissenting_voices"]),
      approval_path: asStr(answers["approval_path"]),
      primary_kpi: asArray(answers["primary_kpi"]),
      measurable_targets: asStr(answers["measurable_targets"]),
      kill_criteria: asStr(answers["kill_criteria"]),
      alternatives_considered: asArray(answers["alternatives_considered"]),
      alternatives_detail: asStr(answers["alternatives_detail"]),
      lock_in_tolerance: asStr(answers["lock_in_tolerance"]),
      existing_ai_systems: asArray(answers["existing_ai_systems"]),
      data_readiness: asStr(answers["data_readiness"]),
      training_data_sources: asArray(answers["training_data_sources"]),
      customer_data_usage_rights: asStr(answers["customer_data_usage_rights"]),
      ip_indemnification_needed: asStr(answers["ip_indemnification_needed"]),
      business_continuity_requirement: asStr(answers["business_continuity_requirement"]),
      multi_region_requirement: asStr(answers["multi_region_requirement"]),
      artifacts_received: asArray(answers["artifacts_received"]),
      gaps_already_known: asStr(answers["gaps_already_known"]),
      diligence_team_composition: asArray(answers["diligence_team_composition"]),
      context_notes: asStr(answers["context_notes"]),
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
      <IntakeQuestionnaire
        industry={industry}
        initialAnswers={answers}
        onChange={handleChange}
      />
      <SubmitToKnowledgeBase
        step="intake"
        buildPayload={buildIntakePayload}
        disabledReason={disabledReason}
      />
    </div>
  );
}
