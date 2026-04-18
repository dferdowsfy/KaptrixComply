import { SCORING_DIMENSIONS } from "@/lib/constants";
import type { AdjustmentProposal, ScoreDimension } from "@/lib/types";

/**
 * Adjustment bounds. These match the methodology spec and the DB CHECK
 * constraints in supabase/migrations/00016_create_adjustment_proposals.sql.
 *
 *   - PER_SUB_CRITERION_ABS: max |delta| per individual proposal.
 *   - PER_DIMENSION_PCT: max combined |delta| per dimension as a fraction
 *     of the 0–5 scale (15% × 5.0 = 0.75 absolute).
 *
 * No cross-dimension leakage: each proposal carries (dimension, sub_criterion)
 * and is enforced to land only on its target sub-score.
 */
export const ADJUSTMENT_BOUNDS = {
  PER_SUB_CRITERION_ABS: 0.5,
  PER_DIMENSION_PCT: 0.15,
} as const;

export const DIMENSION_MAX_ABS_DELTA =
  5 * ADJUSTMENT_BOUNDS.PER_DIMENSION_PCT; // 0.75

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

/**
 * Apply approved adjustments to one base sub-score.
 *
 * Pure & deterministic. Same inputs → same output, every time.
 *
 * Two clamps:
 *  1. Each individual proposal is clamped to ±PER_SUB_CRITERION_ABS.
 *  2. The aggregate per-dimension delta visible at this sub-score is
 *     constrained by the caller via `dimensionMaxAbs`.
 *  3. Final result is clamped to the legal score range [0, 5].
 */
export function applyApprovedAdjustments(
  baseSubScore: number,
  approvedForSub: AdjustmentProposal[],
  dimensionMaxAbs: number = DIMENSION_MAX_ABS_DELTA,
): number {
  const perItem = approvedForSub.map((p) =>
    clamp(
      p.proposed_delta,
      -ADJUSTMENT_BOUNDS.PER_SUB_CRITERION_ABS,
      ADJUSTMENT_BOUNDS.PER_SUB_CRITERION_ABS,
    ),
  );
  const sum = perItem.reduce((a, b) => a + b, 0);
  const clampedSum = clamp(sum, -dimensionMaxAbs, dimensionMaxAbs);
  return clamp(baseSubScore + clampedSum, 0, 5);
}

/**
 * Group approved proposals by (dimension, sub_criterion) — convenience
 * helper for the calculator.
 */
export function groupApprovedBySub(
  approved: AdjustmentProposal[],
): Map<string, AdjustmentProposal[]> {
  const out = new Map<string, AdjustmentProposal[]>();
  for (const a of approved) {
    if (a.status !== "approved") continue;
    const k = subKey(a.dimension, a.sub_criterion);
    out.set(k, [...(out.get(k) ?? []), a]);
  }
  return out;
}

export function subKey(dim: ScoreDimension, sub: string): string {
  return `${dim}::${sub}`;
}

/**
 * Validate a proposal payload BEFORE inserting. Mirrors DB constraints so
 * we surface human-readable errors at the API boundary.
 */
export function validateProposalInput(input: {
  dimension: string;
  sub_criterion: string;
  proposed_delta: number;
  rationale: string;
  confidence: number;
}): string | null {
  if (!SCORING_DIMENSIONS.some((d) => d.key === input.dimension)) {
    return `Unknown dimension: ${input.dimension}`;
  }
  const dim = SCORING_DIMENSIONS.find((d) => d.key === input.dimension)!;
  if (!dim.sub_criteria.some((s) => s.key === input.sub_criterion)) {
    return `Unknown sub_criterion '${input.sub_criterion}' for ${input.dimension}`;
  }
  if (
    input.proposed_delta < -ADJUSTMENT_BOUNDS.PER_SUB_CRITERION_ABS ||
    input.proposed_delta > ADJUSTMENT_BOUNDS.PER_SUB_CRITERION_ABS
  ) {
    return `proposed_delta must be within ±${ADJUSTMENT_BOUNDS.PER_SUB_CRITERION_ABS}`;
  }
  if (!input.rationale || input.rationale.length < 20) {
    return "rationale must be at least 20 characters";
  }
  if (input.confidence < 0 || input.confidence > 1) {
    return "confidence must be in [0, 1]";
  }
  return null;
}
