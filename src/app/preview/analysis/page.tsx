"use client";

import { useCallback } from "react";
import { PreAnalysisDashboard } from "@/components/pre-analysis/pre-analysis-dashboard";
import { DocumentsPanel } from "@/components/pre-analysis/documents-panel";
import { SectionHeader } from "@/components/preview/preview-shell";
import { SubmitToKnowledgeBase } from "@/components/preview/submit-to-knowledge-base";
import { demoAnalyses, demoDocuments, demoEngagement } from "@/lib/demo-data";
import type { PreAnalysisPayload } from "@/lib/preview/knowledge-base";
import type { ScoreDimension } from "@/lib/types";
import { useSelectedPreviewClient } from "@/hooks/use-selected-preview-client";
import { usePreviewSnapshot } from "@/hooks/use-preview-data";

export default function PreviewAnalysisPage() {
  const { selectedId } = useSelectedPreviewClient();
  const { snapshot } = usePreviewSnapshot(selectedId);
  const documents = snapshot?.documents ?? demoDocuments;
  const analyses = snapshot?.analyses ?? demoAnalyses;
  const engagementId = snapshot?.engagement.id ?? demoEngagement.id;

  const buildPayload = useCallback(() => {
    const critical: PreAnalysisPayload["critical_red_flags"] = [];
    const high: PreAnalysisPayload["high_red_flags"] = [];
    let open_questions_total = 0;
    for (const a of analyses) {
      open_questions_total += a.open_questions.length;
      for (const f of a.red_flags) {
        const entry = {
          flag: f.flag,
          dimension: (f.dimension ?? null) as ScoreDimension | null,
        };
        if (f.severity === "critical") critical.push(entry);
        else if (f.severity === "high") high.push(entry);
      }
    }
    const payload: PreAnalysisPayload = {
      kind: "pre_analysis",
      analyses_total: analyses.length,
      critical_red_flags: critical,
      high_red_flags: high,
      open_questions_total,
    };
    const summary = `${analyses.length} analyses · ${critical.length} critical / ${high.length} high red flags`;
    return { payload, summary };
  }, [analyses]);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Module 2"
        title="AI-assisted pre-analysis"
        description="Per-document extraction and synthesis for claims, contradictions, red flags, and operator follow-up questions. Add more evidence below — every file becomes context for downstream reasoning."
      />
      <DocumentsPanel baseDocs={documents} />
      <PreAnalysisDashboard analyses={analyses} engagementId={engagementId} />
      <SubmitToKnowledgeBase
        step="pre_analysis"
        buildPayload={buildPayload}
        disabledReason={
          analyses.length === 0 ? "Run pre-analysis before submitting." : null
        }
      />
    </div>
  );
}
