"use client";

import { useCallback, useState } from "react";
import {
  IndustryCoverageMatrix,
  type IndustryCoverageState,
} from "@/components/documents/industry-coverage-matrix";
import { SectionHeader } from "@/components/preview/preview-shell";
import { SubmitToKnowledgeBase } from "@/components/preview/submit-to-knowledge-base";
import type { CoveragePayload } from "@/lib/preview/knowledge-base";
import { demoDocuments } from "@/lib/demo-data";
import { useSelectedPreviewClient } from "@/hooks/use-selected-preview-client";
import { usePreviewSnapshot } from "@/hooks/use-preview-data";

export default function PreviewCoveragePage() {
  const { selectedId } = useSelectedPreviewClient();
  const { snapshot } = usePreviewSnapshot(selectedId);
  const documents = snapshot?.documents ?? demoDocuments;
  const [coverageState, setCoverageState] =
    useState<IndustryCoverageState | null>(null);

  const buildPayload = useCallback(() => {
    const s = coverageState;
    const payload: CoveragePayload = {
      kind: "coverage",
      industry: s?.industry ?? null,
      documents_total: documents.length,
      gaps_count: s?.gap_categories.length ?? 0,
      gap_summaries: s?.gap_categories.slice(0, 6) ?? [],
    };
    const summary = s
      ? `${s.industry_label} · ${s.provided}/${s.total} artifacts · ${s.gap_categories.length} gap(s)`
      : `${documents.length} documents submitted`;
    return { payload, summary };
  }, [coverageState, documents.length]);

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Module 1"
        title="Industry-calibrated coverage matrix"
        description="Switch industries and Kaptrix pre-populates expected artifacts, highlights missing evidence, and explains confidence impacts."
      />
      <div className="rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
        <IndustryCoverageMatrix
          documents={documents}
          onStateChange={setCoverageState}
        />
      </div>
      <SubmitToKnowledgeBase step="coverage" buildPayload={buildPayload} />
    </div>
  );
}
