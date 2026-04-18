import { calculateFinalScore } from "../../../src/lib/scoring/calculator";
import { SCORING_DIMENSIONS } from "../../../src/lib/constants";
import type {
  AdjustmentProposal,
  Score,
  ScoreDimension,
} from "../../../src/lib/types";

function fullScores(value = 3): Score[] {
  const out: Score[] = [];
  for (const dim of SCORING_DIMENSIONS) {
    for (const sub of dim.sub_criteria) {
      out.push({
        id: `${dim.key}-${sub.key}`,
        engagement_id: "e1",
        dimension: dim.key,
        sub_criterion: sub.key,
        score_0_to_5: value,
        weight: 1,
        operator_rationale: "x".repeat(20),
        evidence_citations: [],
        pattern_match_case_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: "u1",
      });
    }
  }
  return out;
}

function approved(
  dim: ScoreDimension,
  sub: string,
  delta: number,
  id = `${dim}-${sub}-adj`,
): AdjustmentProposal {
  return {
    id,
    engagement_id: "e1",
    source_kind: "pre_analysis",
    source_id: null,
    dimension: dim,
    sub_criterion: sub,
    proposed_delta: delta,
    rationale: "x".repeat(25),
    evidence_locator: null,
    classifier: null,
    confidence: 0.8,
    status: "approved",
    decided_by: "u1",
    decided_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
}

describe("calculateFinalScore", () => {
  it("equals base when there are no approved adjustments", () => {
    const scores = fullScores(3);
    const result = calculateFinalScore(scores, [], 0.6);
    expect(result.composite_score).toBe(result.base_composite);
    expect(result.adjustment_composite_delta).toBe(0);
  });

  it("applies a positive delta to the right dimension only", () => {
    const scores = fullScores(3);
    const dim = SCORING_DIMENSIONS[0];
    const sub = dim.sub_criteria[0].key;
    const result = calculateFinalScore(
      scores,
      [approved(dim.key, sub, 0.5)],
      0.6,
    );
    // Only dim should move
    expect(result.dimension_scores[dim.key]).toBeGreaterThan(3);
    for (const other of SCORING_DIMENSIONS.slice(1)) {
      expect(result.dimension_scores[other.key]).toBe(3);
    }
    expect(result.composite_score).toBeGreaterThanOrEqual(
      result.base_composite,
    );
    expect(result.adjustment_composite_delta).toBeGreaterThanOrEqual(0);
  });

  it("never moves a dimension by more than DIMENSION_MAX_ABS_DELTA via aggregate", () => {
    const scores = fullScores(3);
    const dim = SCORING_DIMENSIONS[0];
    const sub = dim.sub_criteria[0].key;
    // Stack five proposals at +0.5 on the same sub. Aggregate must be
    // capped at +0.75 for that sub.
    const props = Array.from({ length: 5 }, (_, i) =>
      approved(dim.key, sub, 0.5, `p${i}`),
    );
    const result = calculateFinalScore(scores, props, 0.6);
    const subCount = dim.sub_criteria.length;
    // Affected sub moves by at most +0.75; others unchanged at 3.
    const expectedAvg = (3 + 0.75 + 3 * (subCount - 1)) / subCount;
    expect(result.dimension_scores[dim.key]).toBeCloseTo(
      Math.round(expectedAvg * 10) / 10,
      1,
    );
  });

  it("confidence is reported but does not affect the composite", () => {
    const scores = fullScores(3);
    const a = calculateFinalScore(scores, [], 0.1);
    const b = calculateFinalScore(scores, [], 0.99);
    expect(a.composite_score).toBe(b.composite_score);
    expect(a.evidence_confidence).toBe(0.1);
    expect(b.evidence_confidence).toBe(0.99);
  });

  it("is deterministic", () => {
    const scores = fullScores(3);
    const props = [
      approved(SCORING_DIMENSIONS[0].key, SCORING_DIMENSIONS[0].sub_criteria[0].key, 0.3),
      approved(SCORING_DIMENSIONS[1].key, SCORING_DIMENSIONS[1].sub_criteria[0].key, -0.2),
    ];
    const a = calculateFinalScore(scores, props, 0.5);
    const b = calculateFinalScore(scores, props, 0.5);
    expect(a).toEqual(b);
  });
});
