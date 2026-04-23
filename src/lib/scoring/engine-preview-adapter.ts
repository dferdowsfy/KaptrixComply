// Preview → engine adapter.
//
// Converts the preview workspace's existing context (intake payload,
// uploaded documents, extracted insights, pre-analysis payload) into
// the structured inputs the deterministic scoring engine expects.
//
// The adapter is PURE and environment-agnostic — no localStorage, no
// network. Callers (client components) read these sources from their
// own stores and hand them in.

import type { ScoreDimension } from "@/lib/types";
import type {
  IntakePayload,
  PreAnalysisPayload,
} from "@/lib/preview/kb-format";
import type { UploadedDoc } from "@/lib/preview/uploaded-docs";
import type { KnowledgeInsight } from "@/components/documents/knowledge-insights-panel";
import type {
  ArtifactEvidence,
  IntakeResponse,
  ScoringEngineInput,
} from "@/lib/scoring/engine-types";

// ── Intake payload → IntakeResponse[] ────────────────────────────────

/**
 * Flatten the structured intake payload into canonical-field
 * IntakeResponses that the engine's intake rule table keys on. Only
 * fields with values are emitted — empty strings / empty arrays /
 * nulls are omitted so the engine treats them as "not answered"
 * rather than as a negative signal.
 */
export function intakePayloadToResponses(
  p: IntakePayload | null | undefined,
): IntakeResponse[] {
  if (!p) return [];
  const out: IntakeResponse[] = [];

  const pushIfString = (field: string, v: string | undefined) => {
    if (typeof v === "string" && v.trim().length > 0) {
      out.push({ field, value: v.trim() });
    }
  };
  const pushIfArray = (field: string, v: string[] | undefined) => {
    if (Array.isArray(v) && v.length > 0) {
      out.push({ field, value: v });
    }
  };

  pushIfArray("regulatory_exposure", p.regulatory_exposure);
  pushIfArray("diligence_priorities", p.diligence_priorities);
  pushIfArray("red_flag_priors", p.red_flag_priors);
  pushIfArray("deal_thesis", p.deal_thesis);
  pushIfArray("dissenting_voices", p.dissenting_voices);
  pushIfArray("primary_kpi", p.primary_kpi);
  pushIfArray("alternatives_considered", p.alternatives_considered);
  pushIfArray("existing_ai_systems", p.existing_ai_systems);
  pushIfArray("training_data_sources", p.training_data_sources);
  pushIfArray("artifacts_received", p.artifacts_received);
  pushIfArray("diligence_team_composition", p.diligence_team_composition);

  pushIfString("engagement_type", p.engagement_type);
  pushIfString("buyer_archetype", p.buyer_archetype);
  pushIfString("buyer_industry", p.buyer_industry);
  pushIfString("target_size_usd", p.target_size_usd);
  pushIfString("investment_size_usd", p.investment_size_usd);
  pushIfString("annual_run_rate_usd", p.annual_run_rate_usd);
  pushIfString("decision_horizon_days", p.decision_horizon_days);
  pushIfString("deal_stage", p.deal_stage);
  pushIfString("internal_sponsor_role", p.internal_sponsor_role);
  pushIfString("approval_path", p.approval_path);
  pushIfString("measurable_targets", p.measurable_targets);
  pushIfString("kill_criteria", p.kill_criteria);
  pushIfString("alternatives_detail", p.alternatives_detail);
  pushIfString("lock_in_tolerance", p.lock_in_tolerance);
  pushIfString("data_readiness", p.data_readiness);
  pushIfString("customer_data_usage_rights", p.customer_data_usage_rights);
  pushIfString("ip_indemnification_needed", p.ip_indemnification_needed);
  pushIfString(
    "business_continuity_requirement",
    p.business_continuity_requirement,
  );
  pushIfString("multi_region_requirement", p.multi_region_requirement);
  pushIfString("gaps_already_known", p.gaps_already_known);
  pushIfString("context_notes", p.context_notes);

  return out;
}

// ── Document categories → sub-criterion mapping ──────────────────────
//
// Each uploaded document category maps to one or more sub-criteria it
// provides evidence for. Presence of a parsed document in a category
// emits `supports_high` artifacts for the mapped sub-criteria — the
// engine then validates intake claims and unlocks the ≥4 band.

const CATEGORY_TO_SUBS: Record<
  string,
  Array<{ dimension: ScoreDimension; sub_criterion: string }>
> = {
  security: [
    { dimension: "governance_safety", sub_criterion: "access_controls" },
    { dimension: "governance_safety", sub_criterion: "logging_observability" },
    { dimension: "data_sensitivity", sub_criterion: "customer_isolation" },
  ],
  architecture: [
    { dimension: "tooling_exposure", sub_criterion: "model_concentration" },
    { dimension: "tooling_exposure", sub_criterion: "api_brittleness" },
    { dimension: "production_readiness", sub_criterion: "scaling" },
  ],
  model_ai: [
    { dimension: "product_credibility", sub_criterion: "ai_value_vs_wrapper" },
    { dimension: "data_sensitivity", sub_criterion: "training_provenance" },
    { dimension: "governance_safety", sub_criterion: "output_risk" },
  ],
  data_privacy: [
    { dimension: "data_sensitivity", sub_criterion: "regulated_data" },
    { dimension: "data_sensitivity", sub_criterion: "customer_isolation" },
  ],
  customer_contracts: [
    { dimension: "product_credibility", sub_criterion: "customer_vs_claimed" },
    { dimension: "tooling_exposure", sub_criterion: "switching_cost" },
  ],
  vendor_list: [
    { dimension: "tooling_exposure", sub_criterion: "switching_cost" },
    { dimension: "tooling_exposure", sub_criterion: "model_concentration" },
  ],
  financial: [
    { dimension: "production_readiness", sub_criterion: "cost_per_inference" },
    { dimension: "production_readiness", sub_criterion: "ai_unit_economics" },
  ],
  incident_log: [
    { dimension: "production_readiness", sub_criterion: "incident_response" },
    { dimension: "production_readiness", sub_criterion: "model_drift" },
  ],
  team_bios: [
    { dimension: "open_validation", sub_criterion: "specialist_review" },
  ],
  demo: [
    { dimension: "product_credibility", sub_criterion: "demo_production_gap" },
  ],
  deck: [
    { dimension: "product_credibility", sub_criterion: "ai_value_vs_wrapper" },
    { dimension: "product_credibility", sub_criterion: "differentiation" },
  ],
};

function docArtifacts(docs: readonly UploadedDoc[]): ArtifactEvidence[] {
  const out: ArtifactEvidence[] = [];
  for (const d of docs) {
    if (d.parse_status !== "parsed") continue;
    const targets = CATEGORY_TO_SUBS[d.category];
    if (!targets) continue;
    for (const t of targets) {
      out.push({
        id: `doc:${d.id}:${t.sub_criterion}`,
        kind: "document",
        dimension: t.dimension,
        sub_criterion: t.sub_criterion,
        signal: "supports_high",
        claim: `Parsed ${d.category} artifact provided: ${d.filename}`,
      });
    }
  }
  return out;
}

// ── Extracted insights → artifacts ───────────────────────────────────
//
// High-confidence insights become `supports_mid` evidence on the most
// relevant sub-criterion for their category (they validate the intake
// position but don't by themselves prove a high band). Low-confidence
// insights are ignored to keep the engine noise floor clean.

const INSIGHT_CATEGORY_TO_SUB: Record<
  KnowledgeInsight["category"],
  { dimension: ScoreDimension; sub_criterion: string }
> = {
  commercial: {
    dimension: "product_credibility",
    sub_criterion: "customer_vs_claimed",
  },
  technical: {
    dimension: "product_credibility",
    sub_criterion: "ai_value_vs_wrapper",
  },
  regulatory: {
    dimension: "data_sensitivity",
    sub_criterion: "regulated_data",
  },
  financial: {
    dimension: "production_readiness",
    sub_criterion: "cost_per_inference",
  },
  operational: {
    dimension: "production_readiness",
    sub_criterion: "scaling",
  },
};

function insightArtifacts(
  insights: readonly KnowledgeInsight[],
): ArtifactEvidence[] {
  const out: ArtifactEvidence[] = [];
  for (const i of insights) {
    if (i.confidence === "low") continue;
    const t = INSIGHT_CATEGORY_TO_SUB[i.category];
    if (!t) continue;
    out.push({
      id: `insight:${i.id}`,
      kind: "insight",
      dimension: t.dimension,
      sub_criterion: t.sub_criterion,
      signal: i.confidence === "high" ? "supports_high" : "supports_mid",
      claim: i.insight,
      locator: i.source_document,
    });
  }
  return out;
}

// ── Pre-analysis red flags → artifacts ───────────────────────────────
//
// Pre-analysis flags are dimension-tagged already; we map each flag to
// a canonical sub-criterion per dimension. Critical and high flags are
// `supports_low` (evidence the target sits in the 1–2 band).

const DIMENSION_PRIMARY_SUB: Record<ScoreDimension, string> = {
  product_credibility: "customer_vs_claimed",
  tooling_exposure: "api_brittleness",
  data_sensitivity: "regulated_data",
  governance_safety: "output_risk",
  production_readiness: "incident_response",
  open_validation: "known_unknowns",
};

function preAnalysisArtifacts(
  p: PreAnalysisPayload | null | undefined,
): ArtifactEvidence[] {
  if (!p) return [];
  const out: ArtifactEvidence[] = [];
  const push = (
    flag: { flag: string; dimension: ScoreDimension | null },
    severity: "critical" | "high",
    idx: number,
  ) => {
    if (!flag.dimension) return;
    const sub =
      DIMENSION_PRIMARY_SUB[flag.dimension] ??
      "known_unknowns";
    out.push({
      id: `preanalysis:${severity}:${idx}`,
      kind: "pre_analysis",
      dimension: flag.dimension,
      sub_criterion: sub,
      signal: "supports_low",
      claim: `${severity === "critical" ? "Critical" : "High"} red flag: ${flag.flag}`,
    });
  };
  p.critical_red_flags.forEach((f, i) => push(f, "critical", i));
  p.high_red_flags.forEach((f, i) => push(f, "high", i));
  return out;
}

// ── Top-level adapter ────────────────────────────────────────────────

export interface PreviewEngineInputSources {
  intake?: IntakePayload | null;
  preAnalysis?: PreAnalysisPayload | null;
  uploadedDocs?: readonly UploadedDoc[];
  extractedInsights?: readonly KnowledgeInsight[];
}

export function buildEngineInputFromPreview(
  sources: PreviewEngineInputSources,
): ScoringEngineInput {
  const intake = intakePayloadToResponses(sources.intake);
  const artifacts: ArtifactEvidence[] = [
    ...docArtifacts(sources.uploadedDocs ?? []),
    ...insightArtifacts(sources.extractedInsights ?? []),
    ...preAnalysisArtifacts(sources.preAnalysis),
  ];
  return { intake, artifacts };
}
