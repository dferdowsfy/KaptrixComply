"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import {
  IndustryCoverageMatrix,
  type IndustryCoverageState,
} from "@/components/documents/industry-coverage-matrix";
import { DocumentsPanel } from "@/components/pre-analysis/documents-panel";
import { SectionHeader } from "@/components/preview/preview-shell";
import { SubmitToKnowledgeBase } from "@/components/preview/submit-to-knowledge-base";
import type { CoveragePayload } from "@/lib/preview/knowledge-base";
import { demoDocuments } from "@/lib/demo-data";
import {
  readUploadedDocs,
  subscribeUploadedDocs,
  type UploadedDoc,
} from "@/lib/preview/uploaded-docs";
import type {
  Document,
  DocumentCategory,
  ParseStatus,
} from "@/lib/types";
import { useSelectedPreviewClient } from "@/hooks/use-selected-preview-client";
import { usePreviewSnapshot } from "@/hooks/use-preview-data";

// Map an in-flight upload (which has its own status vocabulary including
// "uploading") to the shape the coverage matrix expects so a freshly
// dropped file flips the artifact row from Missing → Processing → Provided
// without a page reload.
function uploadedToDocument(
  d: UploadedDoc,
  engagementId: string,
): Document {
  const parseStatus: ParseStatus =
    d.parse_status === "uploading" || d.parse_status === "queued"
      ? "queued"
      : d.parse_status === "parsing"
        ? "parsing"
        : d.parse_status === "parsed"
          ? "parsed"
          : "failed";
  return {
    id: d.id,
    engagement_id: engagementId,
    category: d.category as DocumentCategory,
    filename: d.filename,
    storage_path: "",
    file_size_bytes: d.file_size_bytes,
    mime_type: d.mime_type,
    uploaded_at: d.uploaded_at,
    uploaded_by: null,
    parsed_text: d.parsed_text ?? null,
    parse_status: parseStatus,
    parse_error: d.error ?? null,
    token_count: d.token_count ?? null,
  };
}

export default function PreviewCoveragePage() {
  const { selectedId } = useSelectedPreviewClient();
  const { snapshot } = usePreviewSnapshot(selectedId);
  const baseDocuments = snapshot?.documents ?? demoDocuments;
  const engagementId = snapshot?.engagement.id ?? selectedId ?? "preview";

  const uploaded = useSyncExternalStore(
    subscribeUploadedDocs,
    () => readUploadedDocs(selectedId),
    () => [] as readonly UploadedDoc[],
  );

  // Merge seeded + live-uploaded so the coverage matrix reacts as soon
  // as a file finishes parsing.
  const documents = useMemo(
    () => [
      ...baseDocuments,
      ...uploaded.map((d) => uploadedToDocument(d, engagementId)),
    ],
    [baseDocuments, uploaded, engagementId],
  );

  const [coverageState, setCoverageState] =
    useState<IndustryCoverageState | null>(null);
  const [target, setTarget] = useState<{
    category: string;
    label: string;
  } | null>(null);

  const handleArtifactClick = useCallback(
    (category: string, displayName: string) => {
      setTarget({ category, label: displayName });
    },
    [],
  );

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
        title="Evidence & Coverage"
        description="Identify gaps and immediately upload evidence in one workspace. Each artifact row anchors the upload zone below; coverage updates the moment a file finishes parsing."
      />
      <div className="rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
        <IndustryCoverageMatrix
          documents={documents}
          onStateChange={setCoverageState}
          onArtifactClick={handleArtifactClick}
          activeCategory={target?.category ?? null}
        />
      </div>
      <DocumentsPanel
        baseDocs={baseDocuments}
        targetCategory={target?.category ?? null}
        targetLabel={target?.label ?? null}
        onClearTarget={() => setTarget(null)}
      />
      <SubmitToKnowledgeBase step="coverage" buildPayload={buildPayload} />
    </div>
  );
}
