import type { KnowledgeInsight } from "@/components/documents/knowledge-insights-panel";
import type { Industry } from "@/lib/industry-requirements";

export const PREVIEW_INTAKE_STORAGE_KEY = "kaptrix.preview.intake.answers";
export const PREVIEW_CLIENT_INDUSTRY_KEY = "kaptrix.preview.client-industry";

export type PreviewAnswers = Record<string, string | number | string[]>;

type ClientIndustryMap = Record<string, Industry>;

function readIndustryMap(): ClientIndustryMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PREVIEW_CLIENT_INDUSTRY_KEY);
    return raw ? (JSON.parse(raw) as ClientIndustryMap) : {};
  } catch {
    return {};
  }
}

function writeIndustryMap(map: ClientIndustryMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PREVIEW_CLIENT_INDUSTRY_KEY, JSON.stringify(map));
}

/** Persist the industry selected at client-creation time. Locked after. */
export function setClientIndustry(clientId: string, industry: Industry): void {
  const map = readIndustryMap();
  map[clientId] = industry;
  writeIndustryMap(map);
}

/** Read the locked industry for a client. Falls back to legal_tech for the
 *  bundled preview-demo-001 fixture (which the entire demo evidence pool
 *  is structured around). Returns null if truly unknown. */
export function getClientIndustry(clientId: string): Industry | null {
  if (!clientId) return null;
  if (clientId === "preview-demo-001") return "legal_tech";
  const map = readIndustryMap();
  return map[clientId] ?? null;
}

export function mapInsightToIntakeField(insight: KnowledgeInsight): string | null {
  if (!insight.suggested_intake_field) return null;

  const idByField: Record<string, string> = {
    "Red flag priors": "red_flag_priors",
    "Primary AI architecture": "primary_architecture",
    "Regulatory exposure": "regulatory_exposure",
    "Known vendor or model dependencies": "known_vendors",
    "Diligence priorities": "diligence_priorities",
  };

  return idByField[insight.suggested_intake_field] ?? null;
}

export function mergeInsightIntoAnswers(
  prev: PreviewAnswers,
  insight: KnowledgeInsight,
): PreviewAnswers {
  const targetId = mapInsightToIntakeField(insight);
  if (!targetId || !insight.suggested_intake_value) return prev;

  const next = { ...prev };
  const existing = next[targetId];

  if (["red_flag_priors", "regulatory_exposure", "diligence_priorities"].includes(targetId)) {
    const values = Array.isArray(existing) ? existing : [];
    if (!values.includes(insight.suggested_intake_value)) {
      next[targetId] = [...values, insight.suggested_intake_value];
    }
    return next;
  }

  next[targetId] = insight.suggested_intake_value;
  return next;
}

// ============================================================
// AI Category Diligence — intake config selector (Phase 2)
// ============================================================
// Additive, zero-impact helper. No existing caller is modified.
// The target-mode config MUST stay identical to today's behaviour, so
// the 'target' branch intentionally returns `null` — callers interpret
// null as "use the existing industry-driven intake unchanged".
// The 'category' branch advertises a distinct question set focused on
// category-level diligence (market maturity, buyer shape, provider
// landscape, regulatory pressure). Actual question rendering is wired
// up in a later phase; this selector is the seam.

import type { SubjectKind } from "@/lib/types";

export interface CategoryIntakeConfig {
  kind: "category";
  industry: Industry | null;
  /** Stable IDs for the additional intake questions surfaced in category mode. */
  questionIds: readonly string[];
}

export type IntakeConfigSelection = CategoryIntakeConfig | null;

const CATEGORY_QUESTION_IDS = [
  "category_thesis",
  "category_time_horizon",
  "category_buyer_shape",
  "category_provider_landscape",
  "category_regulatory_pressure",
  "category_peer_categories",
  "category_screening_criteria",
] as const;

/**
 * Resolve the intake config for a given subject_kind + industry pair.
 * - 'target' → returns `null` (classic flow unchanged).
 * - 'category' → returns a CategoryIntakeConfig with an industry-aware
 *   question list. Industry is accepted so future phases can tailor the
 *   question set without a second selector.
 */
export function intakeConfigFor(
  subjectKind: SubjectKind,
  industry: Industry | null,
): IntakeConfigSelection {
  if (subjectKind !== "category") return null;
  return {
    kind: "category",
    industry,
    questionIds: CATEGORY_QUESTION_IDS,
  };
}

