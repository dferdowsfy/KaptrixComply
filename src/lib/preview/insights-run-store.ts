"use client";

import { useSyncExternalStore } from "react";
import type { KnowledgeInsight } from "@/components/documents/knowledge-insights-panel";
import {
  mergeExtractedInsights,
  readExtractedInsights,
} from "@/lib/preview/extracted-insights";
import {
  upsertUploadedDoc,
  type UploadedDoc,
} from "@/lib/preview/uploaded-docs";
import {
  readClientKb,
  currentContextSlice,
  formatKnowledgeBaseEvidence,
} from "@/lib/preview/knowledge-base";

const EVENT = "kaptrix:insights-run-change";
const CONCURRENT_LIMIT = 3;

export type InsightsRunStatus = "idle" | "running" | "done" | "error";

export interface InsightsRunState {
  status: InsightsRunStatus;
  clientId: string | null;
  processed: number;
  total: number;
  error?: string;
  lastRunAt?: string;
}

let state: InsightsRunState = {
  status: "idle",
  clientId: null,
  processed: 0,
  total: 0,
};

function notify() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENT));
}

function setState(next: InsightsRunState) {
  state = next;
  notify();
}

function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

function getSnapshot(): InsightsRunState {
  return state;
}

const SERVER_SNAPSHOT: InsightsRunState = {
  status: "idle",
  clientId: null,
  processed: 0,
  total: 0,
};

function getServerSnapshot(): InsightsRunState {
  return SERVER_SNAPSHOT;
}

export function startInsightsRun(args: {
  clientId: string;
  documents: UploadedDoc[];
}): void {
  if (state.status === "running") return;

  const targets = args.documents.filter((d) => d.parsed_text && d.parsed_text.trim());
  if (targets.length === 0) {
    setState({
      status: "error",
      clientId: args.clientId,
      processed: 0,
      total: 0,
      error: "No documents need extraction.",
      lastRunAt: new Date().toISOString(),
    });
    return;
  }

  setState({
    status: "running",
    clientId: args.clientId,
    processed: 0,
    total: targets.length,
  });
  void runInsightsExtraction(args.clientId, targets);
}

async function extractOneDoc(
  clientId: string,
  doc: UploadedDoc,
  kbContext: string,
  existingInsightSummaries: { id: string; category: string; insight: string }[],
): Promise<number> {
  const res = await fetch("/api/preview/extract-insights", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      doc_id: doc.id,
      filename: doc.filename,
      category: doc.category,
      text: doc.parsed_text,
      kb_context: kbContext,
      existing_insight_summaries: existingInsightSummaries,
    }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }

  const data = (await res.json()) as { insights?: KnowledgeInsight[] };
  if (Array.isArray(data.insights) && data.insights.length > 0) {
    mergeExtractedInsights(clientId, data.insights);
    return data.insights.length;
  }
  return 0;
}

async function runInsightsExtraction(
  clientId: string,
  documents: UploadedDoc[],
): Promise<void> {
  // Snapshot KB context (intake, pre_analysis) and existing insights once
  // before the batch so all parallel calls share the same context.
  const kbSlice = currentContextSlice(readClientKb(clientId), "insights");
  const kbContext = formatKnowledgeBaseEvidence(kbSlice).join("\n").slice(0, 2_000);
  const existingInsightSummaries = readExtractedInsights(clientId)
    .map((i) => ({ id: i.id, category: i.category, insight: i.insight }))
    .slice(0, 30);

  // Mark all as extracting up-front so status bars appear immediately.
  for (const doc of documents) {
    upsertUploadedDoc({ ...doc, parse_status: "extracting" });
  }

  let processed = 0;
  let firstError: string | undefined;

  // Process in batches of CONCURRENT_LIMIT to avoid overwhelming the LLM.
  for (let i = 0; i < documents.length; i += CONCURRENT_LIMIT) {
    const batch = documents.slice(i, i + CONCURRENT_LIMIT);

    const results = await Promise.allSettled(
      batch.map((doc) => extractOneDoc(clientId, doc, kbContext, existingInsightSummaries)),
    );

    for (let j = 0; j < results.length; j++) {
      const doc = batch[j];
      const result = results[j];

      if (result.status === "fulfilled") {
        upsertUploadedDoc({
          ...doc,
          parse_status: "parsed",
          insights_count: (doc.insights_count ?? 0) + result.value,
        });
      } else {
        if (!firstError) {
          firstError =
            result.reason instanceof Error ? result.reason.message : "Network error";
        }
        upsertUploadedDoc({ ...doc, parse_status: "parsed" });
      }
    }

    processed += batch.length;
    setState({
      status: "running",
      clientId,
      processed,
      total: documents.length,
      error: firstError,
    });
  }

  setState({
    status: firstError ? "error" : "done",
    clientId,
    processed,
    total: documents.length,
    error: firstError,
    lastRunAt: new Date().toISOString(),
  });
}

export function clearInsightsRun(): void {
  setState({ status: "idle", clientId: null, processed: 0, total: 0 });
}

export function useInsightsRunStore(): InsightsRunState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
