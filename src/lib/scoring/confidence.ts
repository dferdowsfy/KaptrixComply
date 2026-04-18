import { createHash } from "node:crypto";

/**
 * Evidence Confidence — separate from the score itself.
 *
 * Confidence qualifies the score (label / risk flag strength /
 * recommendation strength). It NEVER modifies the composite.
 *
 * Computed deterministically from four inputs. The same inputs hash to
 * the same `inputs_hash`, allowing downstream consumers to detect when
 * a recompute is needed.
 */

export interface ConfidenceInputs {
  /** # of expected document categories present */
  required_doc_categories: number;
  provided_doc_categories: number;
  /** Mean source-quality score in [0,1] across provided artifacts */
  source_quality_avg: number;
  /** Median artifact age in days */
  median_doc_age_days: number;
  /** # of detected contradictions vs. total claim count */
  contradiction_count: number;
  total_claims: number;
}

export interface ConfidenceResult {
  coverage_completeness: number;
  source_quality: number;
  recency: number;
  consistency: number;
  composite: number;
  inputs_hash: string;
}

/**
 * Weights are fixed and documented:
 *   coverage 0.35 · quality 0.25 · recency 0.20 · consistency 0.20
 */
const WEIGHTS = {
  coverage: 0.35,
  quality: 0.25,
  recency: 0.2,
  consistency: 0.2,
} as const;

const RECENCY_WINDOW_DAYS = 365;

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

export function computeEvidenceConfidence(
  input: ConfidenceInputs,
): ConfidenceResult {
  const coverage = clamp01(
    input.provided_doc_categories /
      Math.max(1, input.required_doc_categories),
  );
  const quality = clamp01(input.source_quality_avg);
  const recency = clamp01(
    1 - Math.min(1, input.median_doc_age_days / RECENCY_WINDOW_DAYS),
  );
  const consistency = clamp01(
    1 - input.contradiction_count / Math.max(1, input.total_claims),
  );

  const composite = round2(
    WEIGHTS.coverage * coverage +
      WEIGHTS.quality * quality +
      WEIGHTS.recency * recency +
      WEIGHTS.consistency * consistency,
  );

  const inputs_hash = createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");

  return {
    coverage_completeness: round2(coverage),
    source_quality: round2(quality),
    recency: round2(recency),
    consistency: round2(consistency),
    composite,
    inputs_hash,
  };
}
