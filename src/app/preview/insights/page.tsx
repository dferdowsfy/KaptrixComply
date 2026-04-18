"use client";

import { useCallback } from "react";
import { SectionHeader } from "@/components/preview/preview-shell";
import { SubmitToKnowledgeBase } from "@/components/preview/submit-to-knowledge-base";
import {
  KnowledgeInsightsPanel,
  type KnowledgeInsight,
} from "@/components/documents/knowledge-insights-panel";
import { demoDocuments, demoKnowledgeInsights } from "@/lib/demo-data";
import {
  PREVIEW_INTAKE_STORAGE_KEY,
  mergeInsightIntoAnswers,
  type PreviewAnswers,
} from "@/lib/preview-intake";
import type { InsightsPayload } from "@/lib/preview/knowledge-base";
import { useSelectedPreviewClient } from "@/hooks/use-selected-preview-client";
import { usePreviewSnapshot } from "@/hooks/use-preview-data";

export default function PreviewInsightsPage() {
  const { selectedId } = useSelectedPreviewClient();
  const { snapshot } = usePreviewSnapshot(selectedId);
  const documents = snapshot?.documents ?? demoDocuments;
  const insights = snapshot?.knowledgeInsights ?? demoKnowledgeInsights;

  const handleInsertToIntake = (insight: KnowledgeInsight) => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(PREVIEW_INTAKE_STORAGE_KEY);
    let answers: PreviewAnswers = {};

    if (raw) {
      try {
        answers = JSON.parse(raw) as PreviewAnswers;
      } catch {
        answers = {};
      }
    }

    const next = mergeInsightIntoAnswers(answers, insight);
    window.localStorage.setItem(PREVIEW_INTAKE_STORAGE_KEY, JSON.stringify(next));
  };

  const buildPayload = useCallback(() => {
    const by_category: Record<string, number> = {};
    let high_confidence_count = 0;
    for (const i of insights) {
      by_category[i.category] = (by_category[i.category] ?? 0) + 1;
      if (i.confidence === "high") high_confidence_count += 1;
    }
    const payload: InsightsPayload = {
      kind: "insights",
      insights_total: insights.length,
      by_category,
      high_confidence_count,
    };
    const summary = `${insights.length} insights · ${high_confidence_count} high-confidence`;
    return { payload, summary };
  }, [insights]);

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Module 1"
        title="Document intelligence"
        description="Ask evidence-backed questions and promote relevant insights into the intake model to continuously enrich contextual understanding."
      />
      <div className="rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
        <KnowledgeInsightsPanel
          documents={documents}
          insights={insights}
          onInsertToIntake={handleInsertToIntake}
        />
      </div>
      <SubmitToKnowledgeBase
        step="insights"
        buildPayload={buildPayload}
        disabledReason={
          insights.length === 0 ? "No insights to submit yet." : null
        }
      />
    </div>
  );
}
