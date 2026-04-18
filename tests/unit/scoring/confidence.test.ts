import { computeEvidenceConfidence } from "../../../src/lib/scoring/confidence";

describe("computeEvidenceConfidence", () => {
  const baseInputs = {
    required_doc_categories: 10,
    provided_doc_categories: 7,
    source_quality_avg: 0.8,
    median_doc_age_days: 90,
    contradiction_count: 1,
    total_claims: 50,
  };

  it("returns values in [0, 1]", () => {
    const r = computeEvidenceConfidence(baseInputs);
    for (const v of [
      r.coverage_completeness,
      r.source_quality,
      r.recency,
      r.consistency,
      r.composite,
    ]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("is deterministic — same inputs, same hash", () => {
    const a = computeEvidenceConfidence(baseInputs);
    const b = computeEvidenceConfidence(baseInputs);
    expect(a.composite).toBe(b.composite);
    expect(a.inputs_hash).toBe(b.inputs_hash);
  });

  it("hash changes when inputs change", () => {
    const a = computeEvidenceConfidence(baseInputs);
    const b = computeEvidenceConfidence({
      ...baseInputs,
      contradiction_count: 5,
    });
    expect(a.inputs_hash).not.toBe(b.inputs_hash);
    expect(b.consistency).toBeLessThan(a.consistency);
  });

  it("recency hits 0 after 365 days", () => {
    const r = computeEvidenceConfidence({
      ...baseInputs,
      median_doc_age_days: 400,
    });
    expect(r.recency).toBe(0);
  });

  it("coverage caps at 1 when provided > required", () => {
    const r = computeEvidenceConfidence({
      ...baseInputs,
      provided_doc_categories: 20,
      required_doc_categories: 10,
    });
    expect(r.coverage_completeness).toBe(1);
  });

  it("weights sum to composite correctly", () => {
    const r = computeEvidenceConfidence({
      required_doc_categories: 1,
      provided_doc_categories: 1, // coverage = 1
      source_quality_avg: 1, // quality = 1
      median_doc_age_days: 0, // recency = 1
      contradiction_count: 0,
      total_claims: 1, // consistency = 1
    });
    expect(r.composite).toBe(1);
  });
});
