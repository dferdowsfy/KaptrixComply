import type { ScoreDimension } from "@/lib/types";
import {
  KNOWLEDGE_STEP_LABELS,
  type InsightsPayload,
  type IntakePayload,
  type CoveragePayload,
  type KnowledgeEntry,
  type KnowledgeStep,
  type PreAnalysisPayload,
} from "@/lib/preview/knowledge-base";
import { SCORING_DIMENSIONS } from "@/lib/constants";

// ------------------------------------------------------------------
// Context signals derived from the knowledge base.
//
// A "signal" is a signed delta applied to one scoring dimension with
// a human-readable reason and a pointer back to the step that
// produced it. Signals are aggregated, clamped per-dimension, and
// combined with the operator's explicit sub-criterion scores to
// produce the context-aware composite.
//
// These are demonstration rules, intentionally simple and auditable.
// Proprietary weighting logic lives server-side and is not exposed
// to the marketing surface.
// ------------------------------------------------------------------

export interface ContextSignal {
  dimension: ScoreDimension;
  delta: number; // negative = downward pressure
  reason: string;
  source: KnowledgeStep;
}

export interface ContextAdjustment {
  signals: ContextSignal[];
  /** Net per-dimension deltas after clamping. */
  dimension_delta: Record<ScoreDimension, number>;
  /** Overall composite delta after applying weights and clamp. */
  composite_delta: number;
}

const PER_DIM_UP_CAP = 0.3;
const PER_DIM_DOWN_CAP = -0.75;
const COMPOSITE_CAP = 0.5;

const EMPTY_DIM_DELTAS: Record<ScoreDimension, number> = {
  product_credibility: 0,
  tooling_exposure: 0,
  data_sensitivity: 0,
  governance_safety: 0,
  production_readiness: 0,
  open_validation: 0,
};

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

function intakeSignals(entry: KnowledgeEntry): ContextSignal[] {
  if (entry.payload.kind !== "intake") return [];
  const p = entry.payload as IntakePayload;
  const out: ContextSignal[] = [];

  if (p.regulatory_exposure.length > 0) {
    out.push({
      dimension: "data_sensitivity",
      delta: -0.1 * Math.min(3, p.regulatory_exposure.length),
      reason: `Client flagged regulatory exposure: ${p.regulatory_exposure
        .slice(0, 2)
        .join(", ")}${p.regulatory_exposure.length > 2 ? "…" : ""}`,
      source: "intake",
    });
  }
  if (p.red_flag_priors.length > 0) {
    out.push({
      dimension: "open_validation",
      delta: -0.1 * Math.min(3, p.red_flag_priors.length),
      reason: `Prior red-flag concerns carried from intake (${p.red_flag_priors.length})`,
      source: "intake",
    });
  }
  if (p.diligence_priorities.some((d) => /vendor|lock|model/i.test(d))) {
    out.push({
      dimension: "tooling_exposure",
      delta: -0.15,
      reason: "Client prioritized vendor / model lock-in scrutiny",
      source: "intake",
    });
  }
  return out;
}

function coverageSignals(entry: KnowledgeEntry): ContextSignal[] {
  if (entry.payload.kind !== "coverage") return [];
  const p = entry.payload as CoveragePayload;
  const out: ContextSignal[] = [];

  if (p.gaps_count >= 3) {
    out.push({
      dimension: "open_validation",
      delta: -0.2 - Math.min(0.3, 0.05 * (p.gaps_count - 3)),
      reason: `${p.gaps_count} coverage gaps vs. industry expectations`,
      source: "coverage",
    });
  } else if (p.gaps_count === 0 && p.documents_total >= 6) {
    out.push({
      dimension: "open_validation",
      delta: 0.1,
      reason: "Coverage complete with substantial evidence base",
      source: "coverage",
    });
  }
  return out;
}

function insightsSignals(entry: KnowledgeEntry): ContextSignal[] {
  if (entry.payload.kind !== "insights") return [];
  const p = entry.payload as InsightsPayload;
  const out: ContextSignal[] = [];

  const regulatory = p.by_category["regulatory"] ?? 0;
  const technical = p.by_category["technical"] ?? 0;
  if (regulatory > 0) {
    out.push({
      dimension: "data_sensitivity",
      delta: -0.05 * Math.min(4, regulatory),
      reason: `${regulatory} regulatory-category insight(s) surfaced`,
      source: "insights",
    });
  }
  if (technical > 0 && p.high_confidence_count > 0) {
    out.push({
      dimension: "product_credibility",
      delta: 0.05 * Math.min(3, p.high_confidence_count),
      reason: `${p.high_confidence_count} high-confidence technical insight(s)`,
      source: "insights",
    });
  }
  return out;
}

function preAnalysisSignals(entry: KnowledgeEntry): ContextSignal[] {
  if (entry.payload.kind !== "pre_analysis") return [];
  const p = entry.payload as PreAnalysisPayload;
  const out: ContextSignal[] = [];

  for (const flag of p.critical_red_flags) {
    if (!flag.dimension) continue;
    out.push({
      dimension: flag.dimension,
      delta: -0.2,
      reason: `Critical red flag: ${flag.flag}`,
      source: "pre_analysis",
    });
  }
  for (const flag of p.high_red_flags) {
    if (!flag.dimension) continue;
    out.push({
      dimension: flag.dimension,
      delta: -0.1,
      reason: `High-severity red flag: ${flag.flag}`,
      source: "pre_analysis",
    });
  }
  if (p.open_questions_total >= 5) {
    out.push({
      dimension: "open_validation",
      delta: -0.1,
      reason: `${p.open_questions_total} open questions remain from pre-analysis`,
      source: "pre_analysis",
    });
  }
  if (p.critical_red_flags.length === 0 && p.analyses_total >= 5) {
    out.push({
      dimension: "production_readiness",
      delta: 0.1,
      reason: "No critical flags across a substantial pre-analysis set",
      source: "pre_analysis",
    });
  }
  return out;
}

export function deriveContextSignals(
  kb: Partial<Record<KnowledgeStep, KnowledgeEntry>>,
): ContextSignal[] {
  const signals: ContextSignal[] = [];
  if (kb.intake) signals.push(...intakeSignals(kb.intake));
  if (kb.coverage) signals.push(...coverageSignals(kb.coverage));
  if (kb.insights) signals.push(...insightsSignals(kb.insights));
  if (kb.pre_analysis) signals.push(...preAnalysisSignals(kb.pre_analysis));
  return signals;
}

export function aggregateContextAdjustment(
  signals: ContextSignal[],
): ContextAdjustment {
  const dim: Record<ScoreDimension, number> = { ...EMPTY_DIM_DELTAS };
  for (const s of signals) {
    dim[s.dimension] += s.delta;
  }
  // Clamp per dimension
  (Object.keys(dim) as ScoreDimension[]).forEach((k) => {
    dim[k] = clamp(dim[k], PER_DIM_DOWN_CAP, PER_DIM_UP_CAP);
  });
  // Weighted composite delta
  let composite = 0;
  for (const cfg of SCORING_DIMENSIONS) {
    composite += dim[cfg.key] * cfg.weight;
  }
  composite = clamp(Math.round(composite * 100) / 100, -COMPOSITE_CAP, COMPOSITE_CAP);
  return { signals, dimension_delta: dim, composite_delta: composite };
}

export function stepLabel(step: KnowledgeStep): string {
  return KNOWLEDGE_STEP_LABELS[step];
}
