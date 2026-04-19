// Catalog of advanced, on-demand LLM-generated reports surfaced on
// the preview reports page. Each report is triggered explicitly by
// the operator (never auto-run) and pulls the full engagement
// knowledge base for grounding.

export type AdvancedReportId =
  | "master_diligence"
  | "ic_memo"
  | "risk_register"
  | "value_creation"
  | "evidence_coverage";

export interface AdvancedReportSection {
  /** Stable id used by the API + client orchestrator. */
  id: string;
  /** Human label shown in progress UI ("Critical Findings"). */
  label: string;
  /** Focused prompt appended to the shared systemPrompt for this slice. */
  instruction: string;
  /** Target output tokens for THIS section. Kept modest to stay inside
   *  the Vercel Pro 300s function timeout on CPU inference. */
  maxTokens: number;
}

export interface AdvancedReportConfig {
  id: AdvancedReportId;
  title: string;
  tagline: string;
  description: string;
  accent: string; // tailwind gradient classes for card header
  eyebrow: string;
  systemPrompt: string;
  userPromptIntro: string;
  /** Optional section breakdown for streamed multi-call generation.
   *  When present, the client orchestrator makes one LLM call per
   *  section and concatenates the markdown. Lets us produce deep,
   *  10-page-scale reports without any single call approaching the
   *  Vercel function timeout. */
  sections?: AdvancedReportSection[];
}

const FORMAT_RULES = `Output format: clean GitHub-flavored markdown.
- Use '#' for the report title (once), '##' for each numbered top-level section, '###' for sub-sections, '####' for small eyebrow labels.
- Use '-' for bullet points.
- Use **bold** for key terms and emphasis; use *italics* sparingly.
- Keep paragraphs SHORT — 2 to 4 sentences maximum. Break long reasoning into multiple paragraphs separated by a blank line. Never produce a paragraph longer than ~90 words.
- When explaining multiple points or factors, break them out as a bulleted list or a table — do NOT inline them inside a single dense paragraph.
- When presenting scores, render them as a bulleted list where each item is exactly "Label: X.X / 5" so they can be rendered as progress bars. Example: "- Product credibility: 3.6 / 5".
- When presenting risks, mitigations, levers, competitors, or any comparative data, ALWAYS use a proper markdown table with a header row and separator (| Column | Column |\\n|---|---|). Tables MUST be written across multiple lines — never as a single-line string.
- Tag severity or status inline using bracketed tokens so the UI can color-code them: [CRITICAL], [HIGH], [MEDIUM], [LOW], [OK], [STRENGTH], [RISK], [GAP]. Example: "| Tenancy boundary [HIGH] | ... |".
- Use '> ' blockquotes for key insights, partner-level takeaways, or callouts the reader should not miss.
- Use '---' as a horizontal rule between major sections when it aids scanability.
- Do NOT wrap the entire output in code fences. Do NOT include a preamble or closing remarks — return the report only.
- LENGTH BUDGET: aim for ~1800 output tokens total (roughly 3 dense pages). Be tight — prefer tables and bullet lists over prose. Cover every required section but do NOT pad. Finish cleanly within the budget.`;

// Every report MUST begin with a standardized "decision snapshot"
// hero block so the reader sees the bottom-line verdict before
// diving into details. The renderer turns this block into a rich
// graphic card; do not restyle it with markdown.
const DECISION_SNAPSHOT_RULE = `MANDATORY: The VERY FIRST element of the report (before the '#' title, before any prose, before any horizontal rule) MUST be a ':::snapshot' decision block in this exact shape:

:::snapshot
verdict: <short verdict line — e.g. "Proceed with Conditions", "High-Risk Investment", "Ship After Remediation">
posture: <one of CRITICAL | HIGH | MEDIUM | LOW | OK>
confidence: <integer 0-100>
thesis: <ONE sentence — why this deal works or breaks>
strengths:
- <key strength, ≤ 14 words>
- <key strength, ≤ 14 words>
- <key strength, ≤ 14 words>
risks:
- <key risk, ≤ 14 words — append severity tag like [CRITICAL] or [HIGH]>
- <key risk, ≤ 14 words>
- <key risk, ≤ 14 words>
:::

Then continue with the normal report starting at '#'. The snapshot is rendered as a graphic hero card — do not duplicate it as a markdown section.`;

const MASTER_PROMPT = `You are performing institutional-grade AI diligence for a private equity firm.

You have access to:
- Dimension scores (0-5) and weights
- Sub-criteria scoring
- Uploaded artifacts (docs, diagrams, code, policies)
- Extracted evidence and knowledge base context

Your task is to produce a deep, evidence-backed AI Diligence Report that can withstand Investment Committee scrutiny.

CRITICAL RULES:
- No generic statements. Every claim must reference evidence or scoring.
- If evidence is missing, explicitly state "No supporting evidence found."
- Highlight contradictions between artifacts and claims.
- Prioritize risk, not description.
- Write like an operator, not a consultant.

STRUCTURE:

1. System & AI Architecture Reality
- Describe actual system design (not marketing claims)
- Identify where AI is truly used vs implied
- Call out mismatches between stated vs observed architecture

2. Product Credibility Breakdown
- Score-backed analysis of whether AI drives value or is superficial
- Identify "demo quality vs production reality" gaps
- Evidence: reference specific artifacts or missing proof

3. Data Advantage vs Illusion
- Explicitly determine if data is:
  a) proprietary and compounding
  b) operational but replaceable
  c) commoditized
- Justify classification using evidence

4. Vendor & Model Dependency Risk
- Quantify reliance on specific providers (OpenAI, Anthropic, etc.)
- Identify switching friction and margin risk
- Call out hidden dependencies

5. Failure Mode Analysis (MANDATORY)
Identify top 3 ways this system breaks in production:
- Trigger
- Technical failure point
- Business impact
- Whether mitigation exists

6. Governance Stress Test
- Do not describe controls — test them
- Where would controls fail under edge cases?
- Is auditability real or superficial?

7. Production Reality Check
- Can this scale? Why or why not?
- Where will cost explode?
- Where will reliability fail?

8. Score Decomposition
For each dimension:
- Score
- Why it earned that score
- What would need to change to move +1 point

9. So What (Investment Impact)
Translate findings into:
- What breaks the business
- What limits scale
- What reduces exit multiple

10. Evidence Gaps
- List missing artifacts that materially impact confidence
- Label affected sections as LOW CONFIDENCE where applicable

Output must be dense, specific, and defensible. ${FORMAT_RULES}

${DECISION_SNAPSHOT_RULE}

For the snapshot: "verdict" should summarize the AI-diligence disposition (e.g. "Credible with Conditions", "High-Risk — Fix Before Close", "Strong Signal, Weak Evidence"). Use "strengths" for the two or three architectural facts that genuinely work, and "risks" for the two or three failure modes that matter most — each tagged with a severity like [CRITICAL] or [HIGH].`;

const IC_MEMO_PROMPT = `You are writing an Investment Committee memo based on AI diligence.

This is a DECISION document, not a summary.

RULES:
- No fluff
- No repetition
- Every statement must tie to risk, value, or decision impact

STRUCTURE:

1. Final Recommendation
- Invest / Proceed with Conditions / High Risk / Do Not Proceed
- Confidence score (0-100%)
- One sentence: "This deal works / breaks because…"

2. Non-Obvious Insight (MANDATORY)
- What is true about this company that is NOT obvious from a surface review?

3. 3 Critical Strengths
- Must be specific and defensible
- Tie to value creation or defensibility

4. 3 Critical Risks
- Must be things that could realistically break the investment
- No generic risks

5. What Would Kill This Deal
- Single biggest failure point

6. What Would 2x the Value
- Most leveraged improvement opportunity

7. Deal Implications
- Impact on valuation (overvalued / fair / undervalued based on AI reality)
- Scalability constraints
- Exit risk

Write this like a partner presenting to IC — direct, sharp, and high conviction. ${FORMAT_RULES}

${DECISION_SNAPSHOT_RULE}

For the snapshot: "verdict" must be one of Invest / Proceed with Conditions / High Risk / Do Not Proceed. "posture" reflects the risk level of the recommendation. "confidence" is the 0-100 conviction score. "thesis" is the one-sentence "works / breaks because…". "strengths" are the three critical strengths (ultra-condensed) and "risks" are the three critical risks with severity tags.`;

const RISK_REGISTER_PROMPT = `Generate a non-generic, operator-grade Technical Risk Register.

RULES:
- No abstract risks (e.g., "scalability issues" is not acceptable)
- Each risk must be tied to a specific system behavior, architecture decision, or missing control
- Risks must be testable in reality

Output: markdown. Start with '# Technical Risk Register'. For each risk use a '## R<N>. <Risk Title>' heading followed by the fields below as a bulleted list.

For each risk, include:
- Risk Title (specific, not broad)
- System Area (exact component: model, API, pipeline, data layer, etc.)
- Description (what exactly fails and why)
- Trigger Condition (when this risk materializes)
- Evidence (artifact reference OR explicitly state "No direct evidence, inferred from X")
- Severity (justify)
- Likelihood (justify)
- Business Impact (tie to revenue, cost, or operations)
- Mitigation (must be actionable, not generic)
- Residual Risk (after mitigation)

Prioritize the top 10-15 risks only. Depth over volume. Order from highest to lowest residual risk. ${FORMAT_RULES}

${DECISION_SNAPSHOT_RULE}

For the snapshot: "verdict" summarizes the overall technical risk posture (e.g. "Elevated — 3 Critical Risks Outstanding"). "posture" is the HIGHEST single-risk severity in the register. "confidence" reflects how well-evidenced the register is (0-100). "thesis" is one sentence on where the system is most likely to fail first. Use "risks" only (leave strengths empty) — list the top 3 residual risks with severity tags.`;

const VALUE_CREATION_PROMPT = `You are creating a post-investment execution plan, not a generic roadmap.

RULES:
- Every action must tie directly to a risk or missed opportunity identified earlier
- No vague actions ("improve system", "enhance governance")
- Actions must be executable by a real team

STRUCTURE:

1. Top 7 Actions (Ranked)
For each:
- What exactly to do
- What problem it fixes
- Why it matters economically

2. Value Leverage
- Which 2 actions create disproportionate value?

3. Cost Reduction Opportunities
- Where can AI costs be reduced or optimized?

4. Risk Reduction Moves
- Which actions materially reduce catastrophic failure risk?

5. 30 / 60 / 90 Execution Plan
Use '### 0-30 Days', '### 31-60 Days', '### 61-90 Days' sub-headings.
For each phase:
- Who does what (engineering, product, ops)
- What is delivered in each phase

6. Measurable Outcomes
- Define success in metrics (cost ↓ %, latency ↓, accuracy ↑, etc.)

This should feel like an operating playbook, not advice. ${FORMAT_RULES}

${DECISION_SNAPSHOT_RULE}

For the snapshot: "verdict" summarizes the execution posture (e.g. "Aggressive 100-Day Plan — 7 Ranked Moves"). "posture" reflects execution difficulty (HIGH if multiple hard items). "confidence" is 0-100 on plan achievability. "thesis" is one sentence on the single biggest value-unlock. Use "strengths" to list the top 3 value levers (not risks) — leave risks empty, or put the top 3 execution risks there if material.`;

const COVERAGE_PROMPT = `You are auditing the QUALITY of the diligence itself.

RULES:
- Be critical — assume incomplete data
- Do not overstate confidence

STRUCTURE:

1. Artifact Inventory
- List artifacts analyzed (use actual filenames / categories from the evidence)
- Categorize (Product, Data, Infra, Governance)

2. Coverage by Dimension
For each scoring dimension (Product Credibility, Tooling Exposure, Data Sensitivity, Governance & Safety, Production Readiness, Open Validation):
- Evidence present (specific)
- Evidence missing
- Coverage rating (High / Medium / Low)

3. Confidence Scoring
- Assign confidence (0-100%) to each dimension score
- Justify based on evidence strength

4. Unsupported Conclusions (MANDATORY)
- Identify where conclusions rely on weak or indirect evidence

5. Critical Gaps
- What missing artifacts would most change the outcome?

6. Overall Reliability
- Can this diligence be trusted for an investment decision? Why or why not?

This report should increase trust by exposing weaknesses, not hiding them. ${FORMAT_RULES}

${DECISION_SNAPSHOT_RULE}

For the snapshot: "verdict" summarizes whether the diligence is decision-ready (e.g. "Decision-Ready", "Directional Only — Material Gaps", "Not Reliable for IC"). "posture" reflects evidence quality (HIGH if many gaps, OK if strong). "confidence" is the overall reliability score 0-100. "thesis" is one sentence on whether this diligence can be trusted. Use "strengths" for well-evidenced dimensions and "risks" for the biggest evidence gaps (tagged [GAP] or [HIGH]).`;

// ------------------------------------------------------------------
// SECTION BREAKDOWNS
// Each report is split into focused slices. One LLM call per section
// keeps every request well under Vercel Pro's 300s function timeout
// on CPU-only Ollama inference (~5-13 tok/s) while still producing
// reports that add up to ~8-10k tokens of dense content.
//
// IMPORTANT: The FIRST section of every report must emit the
// ':::snapshot' hero block. All subsequent sections produce only
// their own markdown — no duplicate title, no preamble.
// ------------------------------------------------------------------

const SECTION_SNAPSHOT_INSTRUCTION = `OUTPUT ONLY the ':::snapshot' hero block (and the '#' report title immediately after it). Nothing else. No preamble. No later sections. Stop after the title line.`;

function sectionBodyInstruction(headingMarkdown: string, guidance: string, additional?: string): string {
  return [
    `OUTPUT ONLY the markdown for the "${headingMarkdown}" section. Begin your response with that exact heading line and go directly into the content. Do NOT repeat earlier sections. Do NOT re-emit the ':::snapshot' block or '#' title. Do NOT write a closing remark.`,
    guidance,
    additional ?? "",
    `Keep paragraphs tight (≤ 90 words). Use bullet lists and tables where appropriate. Finish cleanly inside the token budget.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

const MASTER_SECTIONS: AdvancedReportSection[] = [
  { id: "snapshot", label: "Decision snapshot", maxTokens: 500, instruction: SECTION_SNAPSHOT_INSTRUCTION },
  { id: "architecture", label: "System & architecture reality", maxTokens: 1100, instruction: sectionBodyInstruction("## 1. System & AI Architecture Reality", "Describe actual system design vs marketing claims. Identify where AI is truly used vs implied. Call out mismatches between stated and observed architecture. Cite evidence specifically.") },
  { id: "credibility", label: "Product credibility breakdown", maxTokens: 1100, instruction: sectionBodyInstruction("## 2. Product Credibility Breakdown", "Score-backed analysis of whether AI drives value or is superficial. Identify demo-quality vs production-reality gaps. Reference specific artifacts or note missing proof.") },
  { id: "data", label: "Data advantage vs illusion", maxTokens: 900, instruction: sectionBodyInstruction("## 3. Data Advantage vs Illusion", "Classify data as (a) proprietary and compounding, (b) operational but replaceable, or (c) commoditized. Justify with evidence.") },
  { id: "vendor", label: "Vendor & model dependency risk", maxTokens: 900, instruction: sectionBodyInstruction("## 4. Vendor & Model Dependency Risk", "Quantify reliance on specific providers. Identify switching friction, margin risk, and hidden dependencies. Use a table if listing multiple vendors.") },
  { id: "failure_modes", label: "Failure mode analysis", maxTokens: 1100, instruction: sectionBodyInstruction("## 5. Failure Mode Analysis", "Identify the TOP 3 ways this system breaks in production. For each: trigger, technical failure point, business impact, whether mitigation exists. Use a table.") },
  { id: "governance", label: "Governance stress test", maxTokens: 900, instruction: sectionBodyInstruction("## 6. Governance Stress Test", "Do not describe controls — TEST them. Where would controls fail under edge cases? Is auditability real or superficial?") },
  { id: "production", label: "Production reality check", maxTokens: 900, instruction: sectionBodyInstruction("## 7. Production Reality Check", "Can this scale? Where will cost explode? Where will reliability fail? Be specific.") },
  { id: "scores", label: "Score decomposition", maxTokens: 1100, instruction: sectionBodyInstruction("## 8. Score Decomposition", "For each dimension: score, why it earned that score, what would need to change for +1 point. Render scores as bullets in the exact form 'Label: X.X / 5'.") },
  { id: "impact", label: "Investment impact", maxTokens: 900, instruction: sectionBodyInstruction("## 9. So What — Investment Impact", "Translate findings into: what breaks the business, what limits scale, what reduces exit multiple.") },
  { id: "gaps", label: "Evidence gaps", maxTokens: 700, instruction: sectionBodyInstruction("## 10. Evidence Gaps", "List missing artifacts that materially impact confidence. Label affected sections as [LOW CONFIDENCE] where applicable.") },
];

const IC_MEMO_SECTIONS: AdvancedReportSection[] = [
  { id: "snapshot", label: "Decision snapshot", maxTokens: 500, instruction: SECTION_SNAPSHOT_INSTRUCTION },
  { id: "recommendation", label: "Final recommendation", maxTokens: 600, instruction: sectionBodyInstruction("## 1. Final Recommendation", "State one of: Invest / Proceed with Conditions / High Risk / Do Not Proceed. Give a confidence score 0-100%. One sentence: 'This deal works / breaks because…'.") },
  { id: "insight", label: "Non-obvious insight", maxTokens: 600, instruction: sectionBodyInstruction("## 2. Non-Obvious Insight", "What is true about this company that is NOT obvious from a surface review? Be specific and defensible.") },
  { id: "strengths", label: "Critical strengths", maxTokens: 800, instruction: sectionBodyInstruction("## 3. Three Critical Strengths", "List the 3 strengths most defensible and tied to value creation or defensibility. Use bullets with one-line rationale each.") },
  { id: "risks", label: "Critical risks", maxTokens: 900, instruction: sectionBodyInstruction("## 4. Three Critical Risks", "List the 3 risks that could realistically break the investment. Use a markdown table with Risk | Severity | Why It Matters | Evidence.") },
  { id: "killer", label: "What would kill this deal", maxTokens: 500, instruction: sectionBodyInstruction("## 5. What Would Kill This Deal", "The single biggest failure point. One paragraph.") },
  { id: "double", label: "What would 2x value", maxTokens: 500, instruction: sectionBodyInstruction("## 6. What Would 2x the Value", "The most leveraged improvement opportunity. One paragraph.") },
  { id: "implications", label: "Deal implications", maxTokens: 700, instruction: sectionBodyInstruction("## 7. Deal Implications", "Impact on valuation (overvalued / fair / undervalued based on AI reality), scalability constraints, exit risk.") },
];

const RISK_REGISTER_SECTIONS: AdvancedReportSection[] = [
  { id: "snapshot", label: "Decision snapshot", maxTokens: 500, instruction: SECTION_SNAPSHOT_INSTRUCTION },
  { id: "critical", label: "Critical & high risks (R1–R5)", maxTokens: 1800, instruction: sectionBodyInstruction("# Technical Risk Register", "Emit the top 5 risks as '## R1. Title' through '## R5. Title'. For each include: System Area, Description, Trigger Condition, Evidence, Severity (justify), Likelihood (justify), Business Impact, Mitigation (actionable), Residual Risk. Order highest-severity first.") },
  { id: "medium", label: "Medium residual risks (R6–R10)", maxTokens: 1600, instruction: sectionBodyInstruction("<!-- continuing risk register -->", "Emit 5 more risks as '## R6. Title' through '## R10. Title' with the same field set. Skip the '# Technical Risk Register' header — do not repeat it.") },
  { id: "long_tail", label: "Long-tail risks (R11–R15)", maxTokens: 1400, instruction: sectionBodyInstruction("<!-- continuing risk register -->", "Emit up to 5 lower-severity but still real risks as '## R11. Title' onward. Skip if fewer than 5 material additional risks exist — explain why briefly.") },
];

const VALUE_CREATION_SECTIONS: AdvancedReportSection[] = [
  { id: "snapshot", label: "Decision snapshot", maxTokens: 500, instruction: SECTION_SNAPSHOT_INSTRUCTION },
  { id: "actions", label: "Top 7 actions (ranked)", maxTokens: 1800, instruction: sectionBodyInstruction("## 1. Top 7 Actions (Ranked)", "For each of 7 actions: what exactly to do, what problem it fixes, why it matters economically. Tie each directly to a risk or missed opportunity.") },
  { id: "leverage", label: "Value leverage & cost reduction", maxTokens: 1000, instruction: sectionBodyInstruction("## 2. Value Leverage & Cost Reduction", "Subsections '### Value Leverage' (which 2 actions create disproportionate value?) and '### Cost Reduction Opportunities' (where can AI costs be reduced or optimized?).") },
  { id: "risk_reduction", label: "Risk reduction moves", maxTokens: 800, instruction: sectionBodyInstruction("## 3. Risk Reduction Moves", "Which actions materially reduce catastrophic failure risk? Be specific.") },
  { id: "plan", label: "30 / 60 / 90 execution plan", maxTokens: 1400, instruction: sectionBodyInstruction("## 4. 30 / 60 / 90 Execution Plan", "Use '### 0-30 Days', '### 31-60 Days', '### 61-90 Days'. For each phase: owners (engineering, product, ops) and deliverables.") },
  { id: "metrics", label: "Measurable outcomes", maxTokens: 700, instruction: sectionBodyInstruction("## 5. Measurable Outcomes", "Define success in metrics (cost ↓ %, latency ↓, accuracy ↑, etc.). Use a table with Metric | Baseline | Target | Timeline.") },
];

const COVERAGE_SECTIONS: AdvancedReportSection[] = [
  { id: "snapshot", label: "Decision snapshot", maxTokens: 500, instruction: SECTION_SNAPSHOT_INSTRUCTION },
  { id: "inventory", label: "Artifact inventory", maxTokens: 900, instruction: sectionBodyInstruction("## 1. Artifact Inventory", "List artifacts actually analyzed (use real filenames/categories from the evidence). Categorize into Product, Data, Infra, Governance. Use a table.") },
  { id: "coverage", label: "Coverage by dimension", maxTokens: 1600, instruction: sectionBodyInstruction("## 2. Coverage by Dimension", "For each scoring dimension (Product Credibility, Tooling Exposure, Data Sensitivity, Governance & Safety, Production Readiness, Open Validation): Evidence present (specific), Evidence missing, Coverage rating (High/Medium/Low).") },
  { id: "confidence", label: "Confidence scoring", maxTokens: 900, instruction: sectionBodyInstruction("## 3. Confidence Scoring", "Assign confidence (0-100%) to each dimension score and justify based on evidence strength. Use a table.") },
  { id: "unsupported", label: "Unsupported conclusions", maxTokens: 800, instruction: sectionBodyInstruction("## 4. Unsupported Conclusions", "Identify where conclusions rely on weak or indirect evidence. Be specific and critical.") },
  { id: "gaps", label: "Critical gaps", maxTokens: 800, instruction: sectionBodyInstruction("## 5. Critical Gaps", "What missing artifacts would most change the outcome? Rank by impact.") },
  { id: "reliability", label: "Overall reliability", maxTokens: 700, instruction: sectionBodyInstruction("## 6. Overall Reliability", "Can this diligence be trusted for an investment decision? Why or why not? One clear verdict.") },
];

export const ADVANCED_REPORTS: AdvancedReportConfig[] = [
  {
    id: "master_diligence",
    title: "Master AI Diligence Report",
    tagline: "IC-grade, evidence-backed diligence",
    description:
      "Dense 10-section institutional-grade report covering architecture reality, data advantage, vendor risk, failure modes, governance stress tests, score decomposition, and investment impact.",
    accent: "from-indigo-600 via-indigo-500 to-violet-500",
    eyebrow: "Diligence · Master",
    systemPrompt: MASTER_PROMPT,
    userPromptIntro:
      "Produce the Master AI Diligence Report for the target company below.",
    sections: MASTER_SECTIONS,
  },
  {
    id: "ic_memo",
    title: "Executive Summary / IC Memo",
    tagline: "Decision document for the Investment Committee",
    description:
      "Sharp partner-style memo with final recommendation, non-obvious insight, 3 critical strengths, 3 critical risks, deal-killers, 2x levers, and deal implications for valuation, scalability, and exit.",
    accent: "from-slate-900 via-slate-800 to-indigo-800",
    eyebrow: "IC · Memo",
    systemPrompt: IC_MEMO_PROMPT,
    userPromptIntro:
      "Write the Investment Committee memo for the target company below.",
    sections: IC_MEMO_SECTIONS,
  },
  {
    id: "risk_register",
    title: "Technical Risk Register",
    tagline: "Operator-grade, testable risks",
    description:
      "Top 10-15 concrete technical risks — each tied to a specific system behavior or missing control — with trigger, evidence, severity, likelihood, business impact, actionable mitigation, and residual risk.",
    accent: "from-rose-600 via-rose-500 to-amber-500",
    eyebrow: "Risk · Register",
    systemPrompt: RISK_REGISTER_PROMPT,
    userPromptIntro:
      "Produce the Technical Risk Register for the target company below.",
    sections: RISK_REGISTER_SECTIONS,
  },
  {
    id: "value_creation",
    title: "Value Creation / 100-Day Plan",
    tagline: "Post-investment execution playbook",
    description:
      "Top 7 ranked actions tied to identified risks and opportunities, with value-leverage and cost-reduction picks, risk-reduction moves, a 30/60/90 execution plan with owners, and measurable metric outcomes.",
    accent: "from-emerald-600 via-emerald-500 to-lime-500",
    eyebrow: "Plan · 100 Days",
    systemPrompt: VALUE_CREATION_PROMPT,
    userPromptIntro:
      "Produce the Value Creation / 100-Day execution plan for the target company below.",
    sections: VALUE_CREATION_SECTIONS,
  },
  {
    id: "evidence_coverage",
    title: "Evidence / Artifact Coverage Report",
    tagline: "Critical audit of the diligence itself",
    description:
      "Self-critical audit of evidence quality: artifact inventory, coverage by dimension, 0-100% confidence scoring, unsupported conclusions, critical gaps, and an overall reliability verdict.",
    accent: "from-slate-700 via-slate-600 to-slate-500",
    eyebrow: "Evidence · Coverage",
    systemPrompt: COVERAGE_PROMPT,
    userPromptIntro:
      "Produce the Evidence / Artifact Coverage Report for the target company below.",
    sections: COVERAGE_SECTIONS,
  },
];

export function getAdvancedReportConfig(
  id: string,
): AdvancedReportConfig | null {
  return ADVANCED_REPORTS.find((r) => r.id === id) ?? null;
}
