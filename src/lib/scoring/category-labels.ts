// AI Category Diligence — scoring label overlay (Phase 3, additive).
//
// The scoring math (dimensions, sub-criteria, weights, bands, calculator,
// adjustments, confidence) is identical in target-mode and category-mode
// — we deliberately do NOT fork the engine. What changes in category-mode
// is the *framing* a reviewer sees: "Product Credibility" reads naturally
// for a target company, but when diligencing a category it's cleaner to
// show "Category Product Credibility" / equivalents.
//
// This module is a PURE overlay. Call `categoryLabelFor(dimensionKey)` or
// `categoryLabelFor(subCriterionKey)` to get the category-mode string;
// call `applyCategoryLabels(dimension)` to get a non-mutated clone with
// category-mode `name` / sub-criterion `name` fields. No existing caller
// is touched — surfaces that want category-mode labels opt in explicitly.

import type { DimensionConfig, ScoreDimension, SubjectKind } from "@/lib/types";

// ── Dimension-level overrides ─────────────────────────────────────────────────
// Keyed by ScoreDimension so a missing entry cleanly falls back to the
// target-mode label. Phrasing leans on investor-diligence vocabulary
// ("category", "provider landscape", "open questions") rather than
// product-level vocabulary.

const DIMENSION_CATEGORY_LABELS: Record<ScoreDimension, string> = {
  product_credibility:  "Category Product Credibility",
  tooling_exposure:     "Category Tooling & Dependency Exposure",
  data_sensitivity:     "Category Data Sensitivity",
  governance_safety:    "Category Governance & Safety Expectations",
  production_readiness: "Category Production Reality",
  open_validation:      "Category Open Questions & Unknowns",
};

// ── Sub-criterion overrides ───────────────────────────────────────────────────
// Keyed by sub-criterion `key`. A missing entry falls back to the existing
// target-mode `name`. These keys are defined in `src/lib/constants.ts` as
// part of SCORING_DIMENSIONS; the overlay is defensive — any key we do
// not override retains its original label untouched.

const SUB_CRITERION_CATEGORY_LABELS: Record<string, string> = {
  ai_value_vs_wrapper:      "Category AI Value vs. Wrapper Providers",
  // Intentionally partial: we only override where the target-mode phrasing
  // would mislead a category reviewer. Additional overrides can be added
  // without churn — callers always fall back to the target label.
};

/**
 * Return the category-mode label for a dimension or sub-criterion key, or
 * `null` if there is no overlay entry. Callers should fall back to the
 * target-mode name when this returns null.
 */
export function categoryLabelFor(key: string): string | null {
  if (key in DIMENSION_CATEGORY_LABELS) {
    return DIMENSION_CATEGORY_LABELS[key as ScoreDimension];
  }
  if (key in SUB_CRITERION_CATEGORY_LABELS) {
    return SUB_CRITERION_CATEGORY_LABELS[key];
  }
  return null;
}

/**
 * Clone a DimensionConfig with category-mode labels applied. Descriptions,
 * bands, weights, and keys are byte-identical — only display `name`
 * fields change. Returns the input unchanged for subject_kind === 'target'.
 */
export function applyCategoryLabels(
  dimension: DimensionConfig,
  subjectKind: SubjectKind = "category",
): DimensionConfig {
  if (subjectKind !== "category") return dimension;
  return {
    ...dimension,
    name: DIMENSION_CATEGORY_LABELS[dimension.key] ?? dimension.name,
    sub_criteria: dimension.sub_criteria.map((sub) => ({
      ...sub,
      name: SUB_CRITERION_CATEGORY_LABELS[sub.key] ?? sub.name,
    })),
  };
}
