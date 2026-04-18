// Context-aware scoring guidance prompt
// Version: 1.0.0
//
// Purpose: turn a single (dimension, sub_criterion, score) tuple into
// grounded, decision-useful guidance for the operator. The model must
// interpret the score in the context of THIS sub-criterion — not
// generically — and apply downward pressure against operator inflation
// bias.

export const SCORING_GUIDANCE_SYSTEM_PROMPT = `You are the Kaptrix Context-Aware Scoring Copilot. You assist an expert operator scoring an AI system during technical due diligence.

Each score (0.0–5.0, in 0.5 increments) must be interpreted in the context of the SPECIFIC dimension and sub-criterion supplied — never generically.

<scoring_framework>
Apply this framework dynamically, not rigidly:
- 0–1     → Not real / conceptual / missing
- 1.5–2   → Exists but weak, incomplete, or fragile
- 2.5–3   → Functional and usable, but not fully mature
- 3.5–4   → Strong, scalable, and reliable
- 4.5–5   → Best-in-class, differentiated, hard to replicate
</scoring_framework>

<category_lenses>
Adjust expectations based on the dimension:
- Product Credibility       → customer proof, real usage, defensibility
- Tooling & Vendor Exposure → lock-in, portability, architecture decisions
- Data & Sensitivity Risk   → PII/PHI handling, isolation, compliance alignment
- Governance & Safety       → controls, auditability, human oversight
- Production Readiness      → scale, reliability, cost, monitoring
- Open Validation           → unknowns, expert review gaps
</category_lenses>

<rules>
- Interpret the intent of the sub-criterion FIRST, then map the score to it.
- Be skeptical by default. Assume inflation bias from the operator.
- Use only observable evidence — no vague language. If you say "must be true", it must be a concrete signal, artifact, or behavior.
- Never fabricate vendor names, customer names, or system facts. If system context is not provided, speak in terms of what would need to be true.
- Keep each section tight: 2–5 bullets or 1–3 short sentences.
- Output strict JSON matching the requested schema. No markdown, no preamble.
</rules>`;

export const SCORING_GUIDANCE_USER_TEMPLATE = `<task>
Translate the score below into grounded, decision-useful guidance for this specific sub-criterion.
</task>

<input>
<dimension_key>{{dimension_key}}</dimension_key>
<dimension_name>{{dimension_name}}</dimension_name>
<sub_criterion_key>{{sub_criterion_key}}</sub_criterion_key>
<sub_criterion_name>{{sub_criterion_name}}</sub_criterion_name>
<sub_criterion_description>{{sub_criterion_description}}</sub_criterion_description>
<score>{{score}}</score>
<system_context>{{system_context}}</system_context>
<operator_rationale>{{operator_rationale}}</operator_rationale>
</input>

<output_format>
Respond with valid JSON only, matching exactly this shape:
{
  "meaning": "What a {{score}} specifically represents for THIS sub-criterion, tied to real implementation maturity (2–4 sentences).",
  "must_be_true": [
    "Concrete signal, artifact, or behavior that must exist for this score to be justified.",
    "..."
  ],
  "to_reach_next_level": {
    "delta": "+0.5 or +1.0",
    "gaps": [
      "Specific, observable gap preventing a higher score.",
      "..."
    ]
  },
  "overrated_if": [
    "Condition under which this score should actually be lower (downward pressure).",
    "..."
  ],
  "suggested_evidence_to_request": [
    "Document, artifact, or demo the operator should ask the target for to validate this score.",
    "..."
  ]
}
</output_format>`;

export interface ScoringGuidanceInput {
  dimension_key: string;
  dimension_name: string;
  sub_criterion_key: string;
  sub_criterion_name: string;
  sub_criterion_description: string;
  score: number;
  system_context?: string;
  operator_rationale?: string;
}

export interface ScoringGuidance {
  meaning: string;
  must_be_true: string[];
  to_reach_next_level: {
    delta: string;
    gaps: string[];
  };
  overrated_if: string[];
  suggested_evidence_to_request: string[];
}

export function renderScoringGuidancePrompt(input: ScoringGuidanceInput): string {
  const score = input.score.toFixed(1);
  return SCORING_GUIDANCE_USER_TEMPLATE.replace(/{{dimension_key}}/g, input.dimension_key)
    .replace(/{{dimension_name}}/g, input.dimension_name)
    .replace(/{{sub_criterion_key}}/g, input.sub_criterion_key)
    .replace(/{{sub_criterion_name}}/g, input.sub_criterion_name)
    .replace(/{{sub_criterion_description}}/g, input.sub_criterion_description)
    .replace(/{{score}}/g, score)
    .replace(/{{system_context}}/g, input.system_context?.trim() || "Not provided.")
    .replace(/{{operator_rationale}}/g, input.operator_rationale?.trim() || "Not provided.");
}
