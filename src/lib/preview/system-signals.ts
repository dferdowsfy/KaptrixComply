// ------------------------------------------------------------------
// System Signals — Key Changes Engine
//
// Derives material, decision-relevant changes from diffs of the
// preview knowledge base. Every change maps to a scoring dimension,
// a specific risk area, or a named artifact requirement.
//
// Design principles:
//  - Materiality filter: only surface changes that affect IC outcome
//  - Aggregation: one insight per risk area / dimension
//  - No numeric deltas, weights, or internal scoring mechanics
//  - Analyst tone throughout — IC-ready language
//  - Investment translation on every Score Impact item
// ------------------------------------------------------------------

import type { ScoreDimension } from "@/lib/types";
import type {
  CoveragePayload,
  IntakePayload,
  KnowledgeEntry,
  KnowledgeStep,
  PreAnalysisPayload,
} from "@/lib/preview/knowledge-base";

export type ClientKb = Partial<Record<KnowledgeStep, KnowledgeEntry>>;

export const DIMENSION_SHORT_LABEL: Record<ScoreDimension, string> = {
  product_credibility: "Product Credibility",
  tooling_exposure:    "Tooling & Vendor Exposure",
  data_sensitivity:    "Data Risk",
  governance_safety:   "Governance & Safety",
  production_readiness: "Production Readiness",
  open_validation:     "Open Validation",
};

// ─── Investment implication map ──────────────────────────────────────────────
// Plain-English implication for each dimension+direction. No scoring language.
const IMPLICATION: Record<ScoreDimension, Record<"up" | "down", string>> = {
  product_credibility: {
    up:   "Evidence supports AI differentiation claims — strengthens the core investment thesis",
    down: "AI value claims require additional validation — weakens the primary investment thesis",
  },
  tooling_exposure: {
    up:   "Vendor risk is well-managed — abstraction and fallback reduce concentration exposure",
    down: "Vendor lock-in risk elevated — reduces negotiating leverage and complicates exit planning",
  },
  data_sensitivity: {
    up:   "Data practices appropriate for sensitivity level — reduces regulatory and compliance friction",
    down: "Data handling risk identified — regulated-sector deployments may face compliance delays",
  },
  governance_safety: {
    up:   "Governance posture supports enterprise deals — compliance and oversight are in place",
    down: "Compliance risk elevated — may impact enterprise adoption and audit readiness",
  },
  production_readiness: {
    up:   "Infrastructure can absorb anticipated scale — production readiness supports the growth thesis",
    down: "Scalability confidence weakened — cost and reliability at scale remain unvalidated",
  },
  open_validation: {
    up:   "Validation coverage improving — diligence is converging toward a decision-ready state",
    down: "Diligence completeness reduced — IC memo will carry material open questions",
  },
};

// Priority weight: lower = more impactful to the investment decision
const DIM_PRIORITY: Record<ScoreDimension, number> = {
  data_sensitivity:     1,
  governance_safety:    1,
  open_validation:      2,
  tooling_exposure:     2,
  production_readiness: 3,
  product_credibility:  3,
};

// ─── Types ───────────────────────────────────────────────────────────────────

export type KeyChangeSeverity = "critical" | "important";
export type KeyChangeLifecycle = "new" | "updated" | "resolved";
export type KeyChangeCategory  = "risk" | "score_impact" | "gap";

export interface KeyChange {
  /** Stable topic-based fingerprint for dedup */
  id: string;
  category: KeyChangeCategory;
  severity: KeyChangeSeverity;
  lifecycle: KeyChangeLifecycle;
  /** Rank within the batch — 1 = highest investment impact */
  priority: number;
  dimension?: ScoreDimension;
  direction?: "up" | "down";
  /** One-liner analyst headline */
  headline: string;
  /** Why this change was triggered (evidence linkage) */
  reason: string;
  /** Investment-level implication — no scoring math */
  implication: string;
  /** KB step that triggered this */
  evidence_source: string;
  /** Drill-down items (hidden by default) */
  supporting_items?: string[];
}

export interface ConfidenceShift {
  direction: "up" | "down";
  headline: string;
  reason: string;
}

export interface KeyChangesBatch {
  id: string;
  created_at: string;
  /** Single sentence capturing the most important shift — shown at top of panel */
  primaryInsight: string;
  /** All changes, sorted by priority ascending */
  changes: KeyChange[];
  /** Separate confidence track — not folded into Score Impact */
  confidenceShift: ConfidenceShift | null;
  /** Whether there are more changes beyond the 3+3 display cap */
  hasMore: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 40);
}

// ─── Risk derivation ─────────────────────────────────────────────────────────

function deriveIntakeRisks(
  prevIntake: IntakePayload | undefined,
  nextIntake: IntakePayload,
): KeyChange[] {
  const out: KeyChange[] = [];

  // Regulatory exposure — aggregate all new ones into ONE change
  const prevReg  = new Set(prevIntake?.regulatory_exposure ?? []);
  const newReg   = nextIntake.regulatory_exposure.filter((r) => !prevReg.has(r));
  if (newReg.length > 0) {
    const sev: KeyChangeSeverity = newReg.length >= 3 ? "critical" : "important";
    out.push({
      id: "risk:intake:regulatory",
      category: "risk",
      severity: sev,
      lifecycle: "new",
      priority: sev === "critical" ? 1 : 2,
      dimension: "data_sensitivity",
      direction: "down",
      headline:
        newReg.length === 1
          ? `Regulatory exposure identified — ${newReg[0]}`
          : `Regulatory exposure confirmed across ${newReg.length} frameworks`,
      reason: `Intake flagged: ${newReg.join(", ")}`,
      implication: IMPLICATION.data_sensitivity.down,
      evidence_source: "Intake · Regulatory Exposure",
      supporting_items: newReg,
    });
  }

  // Prior red flags — aggregate into ONE change
  const prevFlags = new Set(prevIntake?.red_flag_priors ?? []);
  const newFlags  = nextIntake.red_flag_priors.filter((f) => !prevFlags.has(f));
  if (newFlags.length > 0) {
    out.push({
      id: "risk:intake:red_flags",
      category: "risk",
      severity: "important",
      lifecycle: "new",
      priority: 3,
      dimension: "open_validation",
      direction: "down",
      headline: `Prior concern${newFlags.length > 1 ? "s" : ""} flagged — validation required in this engagement`,
      reason: `${newFlags.length} prior red-flag concern${newFlags.length > 1 ? "s" : ""} carried from intake`,
      implication: IMPLICATION.open_validation.down,
      evidence_source: "Intake · Prior Red Flags",
      supporting_items: newFlags,
    });
  }

  return out;
}

function derivePreAnalysisRisks(
  prevPa: PreAnalysisPayload | undefined,
  nextPa: PreAnalysisPayload,
): KeyChange[] {
  const prevCritSet = new Set((prevPa?.critical_red_flags ?? []).map((f) => f.flag));
  const prevHighSet = new Set((prevPa?.high_red_flags   ?? []).map((f) => f.flag));

  const newCrit = nextPa.critical_red_flags.filter((f) => !prevCritSet.has(f.flag));
  const newHigh = nextPa.high_red_flags.filter(
    (f) => !prevHighSet.has(f.flag) && !prevCritSet.has(f.flag),
  );

  const out: KeyChange[] = [];

  // Group critical flags by dimension — one change per dimension
  const critByDim = new Map<ScoreDimension | null, string[]>();
  for (const f of newCrit) {
    critByDim.set(f.dimension, [...(critByDim.get(f.dimension) ?? []), f.flag]);
  }
  for (const [dim, flags] of critByDim.entries()) {
    const dimLabel = dim ? DIMENSION_SHORT_LABEL[dim] : "multiple areas";
    const basePri  = dim ? DIM_PRIORITY[dim] : 1;
    out.push({
      id: `risk:pa:critical:${dim ?? "cross"}`,
      category: "risk",
      severity: "critical",
      lifecycle: "new",
      priority: basePri,
      dimension: dim ?? undefined,
      direction: "down",
      headline:
        flags.length === 1
          ? `Critical risk identified — ${dimLabel}`
          : `${flags.length} critical findings in ${dimLabel}`,
      reason: flags.length === 1 ? flags[0] : `${flags.length} critical findings identified in pre-analysis`,
      implication: dim ? IMPLICATION[dim].down : "May materially affect investment viability — targeted validation required",
      evidence_source: "Pre-Analysis · Document Review",
      supporting_items: flags,
    });
  }

  // Group high flags by dimension — suppress singletons if already critical-heavy
  const highByDim = new Map<ScoreDimension | null, string[]>();
  for (const f of newHigh) {
    highByDim.set(f.dimension, [...(highByDim.get(f.dimension) ?? []), f.flag]);
  }
  for (const [dim, flags] of highByDim.entries()) {
    // Materiality: suppress lone high flag if there are already 3+ critical changes
    if (flags.length === 1 && newCrit.length >= 3) continue;
    const dimLabel = dim ? DIMENSION_SHORT_LABEL[dim] : "multiple areas";
    const basePri  = (dim ? DIM_PRIORITY[dim] : 2) + 1;
    out.push({
      id: `risk:pa:high:${dim ?? "cross"}`,
      category: "risk",
      severity: "important",
      lifecycle: "new",
      priority: basePri,
      dimension: dim ?? undefined,
      direction: "down",
      headline: flags.length === 1 ? `Risk identified — ${dimLabel}` : `${flags.length} findings in ${dimLabel}`,
      reason: flags.length === 1 ? flags[0] : `${flags.length} findings identified in pre-analysis`,
      implication: dim ? IMPLICATION[dim].down : "Requires targeted validation before IC submission",
      evidence_source: "Pre-Analysis · Document Review",
      supporting_items: flags,
    });
  }

  return out;
}

// ─── Score Impact derivation ─────────────────────────────────────────────────
// One aggregated change per trigger — no numeric values.

function deriveScoreImpacts(
  prevIntake: IntakePayload | undefined,
  nextIntake: IntakePayload,
): KeyChange[] {
  const out: KeyChange[] = [];

  // Engagement type — ONE aggregated change
  if (nextIntake.engagement_type && nextIntake.engagement_type !== prevIntake?.engagement_type) {
    const et = nextIntake.engagement_type;
    let headline     = "";
    let reason       = "";
    let implication  = "";
    let supporting: string[] = [];

    if (et.startsWith("Corporate IC")) {
      headline    = "Analysis calibrated for Corporate IC engagement";
      reason      = "Engagement type set to Corporate IC — findings will be framed for an investment committee audience";
      implication = "Evidence collection should prioritise AI value proof, customer validation, and governance readiness";
      supporting  = [
        "Product Credibility — primary focus on AI differentiation and claim substantiation",
        "Governance & Safety — weighted for IC committee readiness, not day-to-day operations",
      ];
    } else if (et.startsWith("PE") || et.startsWith("Growth") || et.startsWith("Portfolio")) {
      headline    = "Analysis calibrated for PE / Growth Equity diligence";
      reason      = "Engagement type set to PE diligence — findings will be framed for investment thesis validation";
      implication = "Evidence collection should prioritise production proof, scalability, and exit readiness";
      supporting  = [
        "Open Validation — higher evidence bar required before IC",
        "Production Readiness — stress-tested for growth and scale trajectory",
      ];
    } else if (et.startsWith("Vendor selection")) {
      headline    = "Analysis calibrated for Vendor Selection evaluation";
      reason      = "Engagement type set to vendor selection — fit, risk, and switching costs are the primary lens";
      implication = "Vendor lock-in, integration complexity, and contract terms will receive elevated scrutiny";
      supporting  = [
        "Tooling & Vendor Exposure — primary focus on concentration risk and switching costs",
        "Production Readiness — evaluated against buyer's operational requirements",
      ];
    } else {
      return out;
    }

    out.push({
      id: "impact:engagement_type",
      category: "score_impact",
      severity: "important",
      lifecycle: "new",
      priority: 4,
      headline,
      reason,
      implication,
      evidence_source: "Intake · Engagement Type",
      supporting_items: supporting,
    });
  }

  // Diligence priorities — ONE aggregated change (only if ≥ 2 new)
  const prevPri = new Set(prevIntake?.diligence_priorities ?? []);
  const newPri  = (nextIntake.diligence_priorities ?? []).filter((p) => !prevPri.has(p));
  if (newPri.length >= 2) {
    out.push({
      id: "impact:diligence_priorities",
      category: "score_impact",
      severity: "important",
      lifecycle: "new",
      priority: 5,
      headline: `Analysis depth weighted toward ${newPri.length} client-specified risk areas`,
      reason: `Intake prioritised: ${newPri.slice(0, 3).join(", ")}${newPri.length > 3 ? ", and more" : ""}`,
      implication: "Evidence gaps in these areas will receive critical attention — collect targeted artifacts before IC submission",
      evidence_source: "Intake · Diligence Priorities",
      supporting_items: newPri,
    });
  }

  return out;
}

// ─── Coverage gap derivation ─────────────────────────────────────────────────

function deriveCoverageChanges(
  prevCov: CoveragePayload | undefined,
  nextCov: CoveragePayload,
): KeyChange[] {
  const out: KeyChange[] = [];

  const prevGaps = new Set(prevCov?.gap_summaries ?? []);
  const nextGaps = new Set(nextCov.gap_summaries);
  const newGaps      = [...nextGaps].filter((g) => !prevGaps.has(g));
  const resolvedGaps = [...prevGaps].filter((g) => !nextGaps.has(g));

  if (newGaps.length > 0) {
    const sev: KeyChangeSeverity = newGaps.length >= 3 ? "critical" : "important";
    out.push({
      id: "gap:coverage:new",
      category: "gap",
      severity: sev,
      lifecycle: "new",
      priority: sev === "critical" ? 2 : 4,
      headline:
        newGaps.length === 1
          ? `Required artifact not yet provided — ${newGaps[0]}`
          : `${newGaps.length} required artifacts not yet provided`,
      reason: "Industry standards for this engagement require these artifacts for complete scoring",
      implication: "Missing artifacts reduce scoring confidence — collect before final IC submission to avoid unresolved open items",
      evidence_source: "Coverage · Document Requirements",
      supporting_items: newGaps,
    });
  }

  if (resolvedGaps.length > 0) {
    out.push({
      id: "gap:coverage:resolved",
      category: "gap",
      severity: "important",
      lifecycle: "resolved",
      priority: 6,
      headline:
        resolvedGaps.length === 1
          ? `Coverage gap resolved — ${resolvedGaps[0]}`
          : `${resolvedGaps.length} coverage gaps resolved`,
      reason: "Previously missing artifacts have been provided",
      implication: "Scoring confidence increases as evidence coverage improves — diligence completeness is strengthening",
      evidence_source: "Coverage · Document Requirements",
      supporting_items: resolvedGaps,
    });
  }

  return out;
}

// ─── Confidence Shift (separate track) ───────────────────────────────────────

function deriveConfidenceShift(prev: ClientKb, next: ClientKb): ConfidenceShift | null {
  const prevPa  = prev.pre_analysis?.payload.kind === "pre_analysis" ? prev.pre_analysis.payload : undefined;
  const nextPa  = next.pre_analysis?.payload.kind === "pre_analysis" ? next.pre_analysis.payload : undefined;
  const prevCov = prev.coverage?.payload.kind === "coverage" ? prev.coverage.payload : undefined;
  const nextCov = next.coverage?.payload.kind === "coverage" ? next.coverage.payload : undefined;

  // Positive: pre-analysis expanded with no new critical flags
  if (nextPa && nextPa.analyses_total > (prevPa?.analyses_total ?? 0)) {
    const newCritCount = nextPa.critical_red_flags.filter(
      (f) => !(prevPa?.critical_red_flags ?? []).some((p) => p.flag === f.flag),
    ).length;
    if (newCritCount === 0 && nextPa.analyses_total >= 3) {
      return {
        direction: "up",
        headline: "Evidence base strengthened",
        reason: `Pre-analysis completed across ${nextPa.analyses_total} documents — scoring dimensions have stronger evidentiary support`,
      };
    }
  }

  // Positive: gaps resolved
  if (prevCov && nextCov && nextCov.gaps_count < prevCov.gaps_count) {
    const delta = prevCov.gaps_count - nextCov.gaps_count;
    return {
      direction: "up",
      headline: "Coverage gap resolved",
      reason: `Artifact coverage improved — ${delta} previously missing item${delta > 1 ? "s" : ""} provided`,
    };
  }

  // Negative: new critical flags
  if (nextPa && prevPa) {
    const newCrit = nextPa.critical_red_flags.filter(
      (f) => !(prevPa.critical_red_flags ?? []).some((p) => p.flag === f.flag),
    );
    if (newCrit.length > 0) {
      return {
        direction: "down",
        headline: "Critical findings introduce scoring uncertainty",
        reason: `${newCrit.length} new critical finding${newCrit.length > 1 ? "s" : ""} require targeted evidence to resolve before final scoring`,
      };
    }
  }

  // Negative: gaps grew
  if (prevCov && nextCov && nextCov.gaps_count > prevCov.gaps_count) {
    const delta = nextCov.gaps_count - prevCov.gaps_count;
    return {
      direction: "down",
      headline: "Evidence coverage gaps identified",
      reason: `${delta} additional required artifact${delta > 1 ? "s" : ""} not yet provided — scoring relies on incomplete evidence`,
    };
  }

  return null;
}

// ─── Primary Insight ─────────────────────────────────────────────────────────
// Single sentence at the top of the panel. Analyst tone, IC-ready.

function derivePrimaryInsight(changes: KeyChange[], confidence: ConfidenceShift | null): string {
  const topCritRisk = changes.find((c) => c.severity === "critical" && c.category === "risk");
  if (topCritRisk) {
    return topCritRisk.dimension
      ? `${DIMENSION_SHORT_LABEL[topCritRisk.dimension]} is the primary risk factor — requires resolution before IC submission`
      : "Critical risk identified — requires resolution before IC submission";
  }

  const critGap = changes.find((c) => c.severity === "critical" && c.category === "gap");
  if (critGap) return "Artifact collection is the primary gating factor for decision readiness";

  const scoreImpact = changes.find((c) => c.category === "score_impact");
  if (scoreImpact) return scoreImpact.headline;

  if (confidence?.direction === "down") {
    return "Missing evidence is limiting scoring confidence — prioritise artifact collection";
  }
  if (confidence?.direction === "up") {
    return "Evidence base is strengthening — diligence is converging toward decision readiness";
  }

  const top = changes[0];
  return top ? top.headline : "";
}

// ─── Main export ─────────────────────────────────────────────────────────────

const CRITICAL_CAP  = 3;
const IMPORTANT_CAP = 3;

export function buildKeyChangesBatch(prev: ClientKb, next: ClientKb): KeyChangesBatch | null {
  const raw: KeyChange[] = [];

  const prevIntake = prev.intake?.payload.kind === "intake" ? prev.intake.payload : undefined;
  const nextIntake = next.intake?.payload.kind === "intake" ? next.intake.payload : undefined;
  if (nextIntake) {
    raw.push(...deriveIntakeRisks(prevIntake, nextIntake));
    raw.push(...deriveScoreImpacts(prevIntake, nextIntake));
  }

  const prevPa = prev.pre_analysis?.payload.kind === "pre_analysis" ? prev.pre_analysis.payload : undefined;
  const nextPa = next.pre_analysis?.payload.kind === "pre_analysis" ? next.pre_analysis.payload : undefined;
  if (nextPa) raw.push(...derivePreAnalysisRisks(prevPa, nextPa));

  const prevCov = prev.coverage?.payload.kind === "coverage" ? prev.coverage.payload : undefined;
  const nextCov = next.coverage?.payload.kind === "coverage" ? next.coverage.payload : undefined;
  if (nextCov) raw.push(...deriveCoverageChanges(prevCov, nextCov));

  const confidenceShift = deriveConfidenceShift(prev, next);

  // Materiality filter: must have at least one risk, gap, or score impact
  if (raw.length === 0 && !confidenceShift) return null;

  // Sort by priority ascending, then by severity (critical first)
  const severityRank: Record<KeyChangeSeverity, number> = { critical: 0, important: 1 };
  raw.sort((a, b) => a.priority - b.priority || severityRank[a.severity] - severityRank[b.severity]);

  // Assign display priority positions (1-based)
  raw.forEach((c, i) => { c.priority = i + 1; });

  // Determine "hasMore" based on caps
  const totalCritical  = raw.filter((c) => c.severity === "critical").length;
  const totalImportant = raw.filter((c) => c.severity === "important").length;
  const hasMore = totalCritical > CRITICAL_CAP || totalImportant > IMPORTANT_CAP;

  const primaryInsight = derivePrimaryInsight(raw, confidenceShift);

  return {
    id: `batch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
    created_at: new Date().toISOString(),
    primaryInsight,
    changes: raw,
    confidenceShift,
    hasMore,
  };
}

/** Pill headline — counts only, no internal mechanics */
export function formatPillHeadline(batch: KeyChangesBatch): string {
  const nCrit = batch.changes.filter((c) => c.severity === "critical").length;
  const nImp  = batch.changes.filter((c) => c.severity === "important").length;
  const parts: string[] = [];
  if (nCrit > 0) parts.push(`${nCrit} Critical`);
  if (nImp  > 0) parts.push(`${nImp} Important`);
  if (parts.length === 0 && batch.confidenceShift) parts.push("Confidence Shift");
  return parts.join(" · ");
}

//
// Derives auditable, dimension-anchored "what just changed in the
// model" events from diffs of the preview knowledge base. Every
// signal maps back to one of the 6 scoring dimensions, a specific
// sub-criterion, or a named artifact requirement. No generic phrases.
//
// Consumer: src/hooks/use-system-signals.ts
//           src/components/preview/system-signal-pill.tsx
