import {
  ADJUSTMENT_BOUNDS,
  DIMENSION_MAX_ABS_DELTA,
  applyApprovedAdjustments,
  groupApprovedBySub,
  subKey,
  validateProposalInput,
} from "../../../src/lib/scoring/adjustments";
import type { AdjustmentProposal } from "../../../src/lib/types";

function mkProp(
  overrides: Partial<AdjustmentProposal> = {},
): AdjustmentProposal {
  return {
    id: "p1",
    engagement_id: "e1",
    source_kind: "pre_analysis",
    source_id: null,
    dimension: "product_credibility",
    sub_criterion: "ai_value_vs_wrapper",
    proposed_delta: 0.25,
    rationale: "x".repeat(20),
    evidence_locator: null,
    classifier: null,
    confidence: 0.8,
    status: "approved",
    decided_by: null,
    decided_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("applyApprovedAdjustments", () => {
  it("clamps individual proposals to ±0.5", () => {
    const result = applyApprovedAdjustments(3.0, [
      mkProp({ proposed_delta: 1.2 }),
    ]);
    expect(result).toBe(3.0 + ADJUSTMENT_BOUNDS.PER_SUB_CRITERION_ABS);
  });

  it("clamps aggregate to dimensionMaxAbs (default 0.75)", () => {
    const result = applyApprovedAdjustments(3.0, [
      mkProp({ id: "a", proposed_delta: 0.5 }),
      mkProp({ id: "b", proposed_delta: 0.5 }),
    ]);
    expect(result).toBe(3.0 + DIMENSION_MAX_ABS_DELTA);
  });

  it("clamps final score into [0, 5]", () => {
    expect(
      applyApprovedAdjustments(4.9, [mkProp({ proposed_delta: 0.5 })]),
    ).toBe(5);
    expect(
      applyApprovedAdjustments(0.1, [mkProp({ proposed_delta: -0.5 })]),
    ).toBe(0);
  });

  it("is deterministic — same inputs, same output", () => {
    const props = [
      mkProp({ id: "a", proposed_delta: 0.3 }),
      mkProp({ id: "b", proposed_delta: -0.1 }),
    ];
    expect(applyApprovedAdjustments(3.5, props)).toBe(
      applyApprovedAdjustments(3.5, props),
    );
  });
});

describe("groupApprovedBySub", () => {
  it("only includes status=approved", () => {
    const grouped = groupApprovedBySub([
      mkProp({ id: "a", status: "approved" }),
      mkProp({ id: "b", status: "proposed" }),
      mkProp({ id: "c", status: "rejected" }),
    ]);
    expect(
      grouped.get(subKey("product_credibility", "ai_value_vs_wrapper"))
        ?.length,
    ).toBe(1);
  });

  it("groups by (dimension, sub_criterion)", () => {
    const grouped = groupApprovedBySub([
      mkProp({ id: "a", dimension: "product_credibility", sub_criterion: "ai_value_vs_wrapper" }),
      mkProp({ id: "b", dimension: "product_credibility", sub_criterion: "ai_value_vs_wrapper" }),
      mkProp({ id: "c", dimension: "product_credibility", sub_criterion: "demo_production_gap" }),
    ]);
    expect(
      grouped.get(subKey("product_credibility", "ai_value_vs_wrapper"))
        ?.length,
    ).toBe(2);
    expect(
      grouped.get(subKey("product_credibility", "demo_production_gap"))
        ?.length,
    ).toBe(1);
  });
});

describe("validateProposalInput", () => {
  const base = {
    dimension: "product_credibility",
    sub_criterion: "ai_value_vs_wrapper",
    proposed_delta: 0.25,
    rationale: "x".repeat(25),
    confidence: 0.7,
  };
  it("accepts valid input", () => {
    expect(validateProposalInput(base)).toBeNull();
  });
  it("rejects unknown dimension", () => {
    expect(
      validateProposalInput({ ...base, dimension: "nope" }),
    ).toMatch(/Unknown dimension/);
  });
  it("rejects out-of-bounds delta", () => {
    expect(
      validateProposalInput({ ...base, proposed_delta: 0.6 }),
    ).toMatch(/within/);
  });
  it("rejects rationale < 20 chars", () => {
    expect(
      validateProposalInput({ ...base, rationale: "short" }),
    ).toMatch(/at least 20/);
  });
  it("rejects confidence outside [0,1]", () => {
    expect(
      validateProposalInput({ ...base, confidence: 1.1 }),
    ).toMatch(/confidence/);
  });
});
