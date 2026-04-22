"use client";

// Per-client store for KnowledgeInsights extracted from uploaded documents
// via the LLM insight-extraction pass (/api/preview/extract-insights).
// Insights are stored keyed by client_id so switching clients shows the
// right set; they persist across page navigations like uploaded-docs.

import type { KnowledgeInsight } from "@/components/documents/knowledge-insights-panel";

const STORAGE_KEY_PREFIX = "kaptrix.preview.extracted-insights.v1:";
const STORAGE_EVENT = "kaptrix:preview-extracted-insights-change";

type Cache = { raw: string | null | undefined; data: KnowledgeInsight[] };
const cache = new Map<string, Cache>();

function storageKey(clientId: string): string {
  return `${STORAGE_KEY_PREFIX}${clientId}`;
}

function readInsightsForClient(clientId: string): KnowledgeInsight[] {
  if (typeof window === "undefined") return [];
  const c = cache.get(clientId);
  const raw = window.localStorage.getItem(storageKey(clientId));
  if (c && c.raw === raw) return c.data;
  let data: KnowledgeInsight[] = [];
  try {
    data = raw ? (JSON.parse(raw) as KnowledgeInsight[]) : [];
  } catch {
    data = [];
  }
  cache.set(clientId, { raw, data });
  return data;
}

function writeInsightsForClient(
  clientId: string,
  next: KnowledgeInsight[],
): void {
  if (typeof window === "undefined") return;
  const serialized = JSON.stringify(next);
  window.localStorage.setItem(storageKey(clientId), serialized);
  cache.set(clientId, { raw: serialized, data: next });
  window.dispatchEvent(
    new CustomEvent(STORAGE_EVENT, { detail: { clientId } }),
  );
}

/** Read all extracted insights for the given client. */
export function readExtractedInsights(
  clientId: string | null,
): KnowledgeInsight[] {
  if (!clientId) return [];
  return readInsightsForClient(clientId);
}

/**
 * Merge newly extracted insights for a client into the store.
 * De-duplicates by insight id; existing insights with the same id are
 * kept (not overwritten) so removals in the Insights page survive a
 * re-upload of the same file.
 */
export function mergeExtractedInsights(
  clientId: string,
  insights: KnowledgeInsight[],
): void {
  const existing = readInsightsForClient(clientId);
  const existingIds = new Set(existing.map((i) => i.id));
  const novel = insights.filter((i) => !existingIds.has(i.id));
  if (novel.length === 0) return;
  writeInsightsForClient(clientId, [...existing, ...novel]);
}

export function subscribeExtractedInsights(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handleStorage = (e: StorageEvent) => {
    if (e.key !== null && !e.key.startsWith(STORAGE_KEY_PREFIX)) return;
    callback();
  };
  const handleCustom = () => callback();
  window.addEventListener("storage", handleStorage);
  window.addEventListener(STORAGE_EVENT, handleCustom);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(STORAGE_EVENT, handleCustom);
  };
}
