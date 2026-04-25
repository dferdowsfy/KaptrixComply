import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/home/public-header";
import { Reveal } from "@/components/home/reveal";

export const metadata: Metadata = {
  title: "Framework — How Kaptrix Scores AI Compliance",
  description:
    "Evidence over attestation. Structure over checklists. The Kaptrix framework for evaluating AI compliance across six failure-weighted dimensions.",
};

const DIMENSIONS = [
  {
    id: "01",
    name: "Control Credibility",
    body: "Are stated controls actually operating, or is the policy document carrying the load? Do observed system behaviors match what governance documentation asserts?",
  },
  {
    id: "02",
    name: "Tooling & Vendor Exposure",
    body: "Which models, sub-processors, and third-party AI services sit in the data path? How much regulated data crosses those boundaries, and are the contracts, DPAs, and SCCs in place to support it?",
  },
  {
    id: "03",
    name: "Data & Sensitivity Risk",
    body: "Does data handling match the applicable regime — PII, PHI, financial, biometric, cross-border? Are training data, inference inputs, and outputs scoped, retained, and disposed of in line with the law that actually applies?",
  },
  {
    id: "04",
    name: "Governance & Accountability",
    body: "When the system behaves badly — bias, drift, hallucination, leakage — is there a named owner, an incident pathway, and a defensible record of action? Is oversight proportionate to the system's risk tier?",
  },
  {
    id: "05",
    name: "Operational Readiness",
    body: "Are monitoring, logging, evaluation, and human-in-the-loop controls instrumented in production, or only described in policy? Will the evidence exist when an auditor opens the request list?",
  },
  {
    id: "06",
    name: "Open Validation Areas",
    body: "What remains unverified against the applicable frameworks? Where is compliance debt hiding, and which unknowns will a regulator press on first?",
  },
];

const PRINCIPLES = [
  {
    title: "Evidence, not attestation",
    body: "Every score is tied to an artifact — a control test, a log sample, a policy excerpt, a contract clause, a model card. If it cannot be cited, it cannot be scored.",
  },
  {
    title: "Missing evidence is a finding",
    body: "Unknowns are surfaced, not assumed compliant. A dense gap register is itself a signal — and the basis of the remediation plan.",
  },
  {
    title: "Non-compensatory by design",
    body: "Strength on policy cannot offset weakness in operating effectiveness. A pristine AI governance charter does not neutralize an unmonitored model in production. Guardrails catch what an average would hide.",
  },
  {
    title: "Framework-aware, not framework-locked",
    body: "The same control evidence is mapped against the regimes that actually apply to the system — NIST AI RMF, ISO/IEC 42001, EU AI Act, SOC 2, HIPAA, GDPR, sectoral rules. One assessment, multiple framework views, no double work.",
  },
  {
    title: "Two reviewers, then calibration",
    body: "Every evaluation is dual-scored. Where reviewers disagree, the reasoning is the deliverable — not a split-the-difference average.",
  },
];

const SCORING_MECHANICS = [
  {
    title: "Base scoring is operator-owned",
    lead: "The AI does not assign base scores. This is an architectural constraint, not a configuration setting.",
    body: "Each sub-criterion is scored 0.0–5.0 in 0.5 increments by a named reviewer, with rationale attached.",
  },
  {
    title: "Rollup is failure-weighted",
    lead: "Tier-A signals carry the highest weight. Strong performance on lower-tier signals cannot offset weakness at Tier A.",
    body: "Dimension scores roll up by mean. Composite scores apply failure weighting to claim integrity, regulated-data handling, and accountability.",
  },
  {
    title: "Evidence generates proposals, not silent edits",
    lead: "Proposals are bounded — max ±0.5 per sub-criterion, no cross-dimension bleed — and require operator approval.",
    body: "When an artifact contradicts, supports, augments, or exposes a gap, the engine produces a proposal naming the affected sub-criterion, the direction of pressure, the rationale, and the supporting artifacts.",
  },
  {
    title: "Confidence is calculated independently",
    lead: "High score / low confidence and high score / high confidence are surfaced as distinct states.",
    body: "Coverage of the model, source quality, recency, and signal consistency produce a confidence signal that qualifies the score. Confidence does not override the score — it tells the reader how much to trust it.",
  },
  {
    title: "Every output is traceable",
    lead: "If a conclusion cannot be walked back to its source, it is not a conclusion the platform will present.",
    body: "Artifact → proposal → operator decision → score impact. No hidden logic. No silent adjustments.",
  },
];

const DELIVERS = [
  "Dimensional scores with framework crosswalks (NIST AI RMF, ISO/IEC 42001, EU AI Act, SOC 2, GDPR, HIPAA)",
  "Evidence gap register with remediation priority and owner",
  "Control-failure and contradiction surfacing across policy, contract, and runtime",
  "Auditor-ready and committee-ready recommendation with full audit trail",
];

const BUILT_FOR = [
  "Private equity overseeing portfolio AI risk",
  "Growth equity diligencing AI-heavy targets",
  "Family offices reviewing concentrated positions",
  "Corporate development teams pre-acquisition",
];

const FRAMEWORKS = [
  "NIST AI RMF",
  "ISO/IEC 42001",
  "EU AI Act",
  "SOC 2",
  "HIPAA",
  "GDPR",
];

const PIPELINE_STEPS = [
  { step: "Artifact", hint: "Policy, log, contract, model card" },
  { step: "Proposal", hint: "Bounded ±0.5, named sub-criterion" },
  { step: "Operator decision", hint: "Accept, reject, or revise" },
  { step: "Score impact", hint: "Written with rationale" },
];

export default function FrameworkPage() {
  return (
    <div className="min-h-screen bg-[#070815] text-white">
      <PublicHeader />

      {/* ====================================================================
          HERO
      ==================================================================== */}
      <section className="relative overflow-hidden bg-[radial-gradient(ellipse_at_top_right,#1B1F4A_0%,#0D1033_35%,#0A0B1F_65%,#070815_100%)]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-indigo-500/25 blur-[100px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 bottom-0 h-[20rem] w-[20rem] rounded-full bg-fuchsia-500/15 blur-[100px]"
        />
        <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-28 sm:pt-32 lg:pb-32">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-indigo-300">
              The Framework
            </p>
            <h1 className="mt-6 max-w-4xl text-5xl font-light leading-[1.05] tracking-tight sm:text-6xl lg:text-[5.25rem] kx-fade-in">
              How Kaptrix scores{" "}
              <span className="bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
                AI compliance.
              </span>
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-100 sm:text-xl">
              Evidence over attestation. Structure over checklists.
            </p>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">
              Most AI compliance reviews lean on policy PDFs, vendor
              questionnaires, and management interviews. The result is gaps
              that surface later — in front of an auditor, a regulator, or an
              LP. Kaptrix replaces that with a structured, repeatable
              framework that separates what is <em>implemented</em> from what
              is <em>documented</em>, and turns the gap between the two into
              the central object of the review.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-md bg-white px-6 py-3 text-base font-medium text-[#0B0B1A] transition hover:bg-[#F9FAFB]"
              >
                Start a compliance assessment
              </Link>
              <a
                href="#dimensions"
                className="inline-flex items-center justify-center rounded-md border border-white/25 bg-transparent px-6 py-3 text-base font-medium text-white transition hover:bg-white/5"
              >
                See the six dimensions →
              </a>
            </div>

            {/* Framework crosswalk chip row */}
            <div className="mt-14 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                Mapped against
              </span>
              {FRAMEWORKS.map((fw) => (
                <span
                  key={fw}
                  className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-200 backdrop-blur-sm"
                >
                  {fw}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <main className="relative">
        {/* ambient background graphics across the page */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute left-1/2 top-[10%] h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-indigo-700/10 blur-[120px]" />
          <div className="absolute right-[-10%] top-[40%] h-[24rem] w-[24rem] rounded-full bg-fuchsia-600/10 blur-[120px]" />
          <div className="absolute left-[-10%] top-[70%] h-[24rem] w-[24rem] rounded-full bg-sky-500/10 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-6xl space-y-28 px-6 py-24 sm:py-28">
          {/* ================================================================
              SIX DIMENSIONS
          ================================================================ */}
          <section id="dimensions" className="scroll-mt-24">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">
                Six dimensions we evaluate
              </p>
              <h2 className="mt-4 max-w-3xl text-3xl font-normal leading-[1.15] tracking-tight sm:text-5xl">
                Failure modes,{" "}
                <span className="bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
                  not control checklists.
                </span>
              </h2>
            </Reveal>

            <div className="mt-14 grid gap-5 lg:grid-cols-2">
              {DIMENSIONS.map((d, idx) => (
                <Reveal key={d.id} delay={idx * 80}>
                  <article className="group relative h-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur-sm transition hover:border-indigo-300/40 hover:bg-white/[0.05]">
                    <span
                      aria-hidden
                      className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-transparent"
                    />
                    <div className="flex items-start justify-between gap-6">
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-indigo-300">
                          Dimension
                        </span>
                        <h3 className="mt-3 text-2xl font-medium tracking-tight text-white">
                          {d.name}
                        </h3>
                      </div>
                      <span
                        aria-hidden
                        className="text-5xl font-black tracking-tight text-white/10 transition group-hover:text-indigo-300/40 sm:text-6xl"
                      >
                        {d.id}
                      </span>
                    </div>
                    <p className="mt-5 text-base leading-7 text-slate-300">
                      {d.body}
                    </p>
                  </article>
                </Reveal>
              ))}
            </div>
          </section>

          {/* ================================================================
              HOW WE THINK ABOUT SCORING
          ================================================================ */}
          <section className="border-t border-white/10 pt-24">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">
                How we think about scoring
              </p>
              <h2 className="mt-4 max-w-3xl text-3xl font-normal leading-[1.15] tracking-tight sm:text-5xl">
                Five rules,{" "}
                <span className="text-slate-400">non-negotiable.</span>
              </h2>
            </Reveal>

            <ul className="mt-14 space-y-4">
              {PRINCIPLES.map((p, i) => (
                <Reveal key={p.title} delay={i * 70}>
                  <li className="group flex items-start gap-5 rounded-xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-indigo-300/40 hover:bg-white/[0.05]">
                    <span
                      aria-hidden
                      className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-indigo-400/30 bg-indigo-500/10 text-sm font-semibold text-indigo-200"
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="text-lg font-medium tracking-tight text-white">
                        {p.title}
                      </p>
                      <p className="mt-2 text-base leading-7 text-slate-300">
                        {p.body}
                      </p>
                    </div>
                  </li>
                </Reveal>
              ))}
            </ul>
          </section>

          {/* ================================================================
              HOW SCORING WORKS — MECHANICS + PIPELINE DIAGRAM
          ================================================================ */}
          <section className="border-t border-white/10 pt-24">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">
                How scoring works
              </p>
              <h2 className="mt-4 max-w-3xl text-3xl font-normal leading-[1.15] tracking-tight sm:text-5xl">
                Deterministic core.{" "}
                <span className="text-slate-400">
                  Evidence-driven adjustments. Confidence reported separately.
                </span>
              </h2>
            </Reveal>

            {/* Pipeline diagram */}
            <Reveal delay={120}>
              <div className="mt-12 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm sm:p-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                  The audit trail
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] sm:items-center">
                  {PIPELINE_STEPS.map((node, i, arr) => (
                    <PipelineNode
                      key={node.step}
                      step={node.step}
                      hint={node.hint}
                      index={i}
                      last={i === arr.length - 1}
                    />
                  ))}
                </div>
              </div>
            </Reveal>

            {/* Mechanics list */}
            <ul className="mt-10 grid gap-4 lg:grid-cols-2">
              {SCORING_MECHANICS.map((m, i) => (
                <Reveal key={m.title} delay={i * 70}>
                  <li className="h-full rounded-xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-indigo-300/40 hover:bg-white/[0.05]">
                    <div className="flex items-start gap-4">
                      <span
                        aria-hidden
                        className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-indigo-400/30 bg-indigo-500/10 text-xs font-semibold text-indigo-200"
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <p className="text-base font-medium tracking-tight text-white">
                          {m.title}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-indigo-200">
                          {m.lead}
                        </p>
                        <p className="mt-3 text-sm leading-6 text-slate-300">
                          {m.body}
                        </p>
                      </div>
                    </div>
                  </li>
                </Reveal>
              ))}
            </ul>

            {/* Score vs confidence illustration */}
            <Reveal delay={160}>
              <div className="mt-10 grid gap-5 sm:grid-cols-2">
                <ConfidenceCard
                  scoreLabel="4.0 / 5.0"
                  scoreValue={80}
                  confidenceLabel="0.42"
                  confidenceValue={42}
                  state="High score / low confidence"
                  caption="Surfaced as a caution — treat the score as provisional until coverage improves."
                  accent="amber"
                />
                <ConfidenceCard
                  scoreLabel="4.0 / 5.0"
                  scoreValue={80}
                  confidenceLabel="0.86"
                  confidenceValue={86}
                  state="High score / high confidence"
                  caption="Audit-ready. Evidence coverage, recency, and consistency all support the conclusion."
                  accent="indigo"
                />
              </div>
            </Reveal>
          </section>

          {/* ================================================================
              WHAT Kaptrix DELIVERS
          ================================================================ */}
          <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-900/40 via-[#0D1033] to-fuchsia-900/30 p-8 sm:p-14">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-[100px]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-fuchsia-500/15 blur-[100px]"
            />
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-200">
                What Kaptrix delivers
              </p>
              <h2 className="mt-4 max-w-3xl text-3xl font-normal leading-[1.1] tracking-tight sm:text-5xl">
                A defensible{" "}
                <span className="bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
                  compliance profile.
                </span>
              </h2>
              <p className="mt-6 max-w-3xl text-base leading-7 text-slate-200 sm:text-lg">
                Dimensional scores mapped to the frameworks that apply, an
                evidence gap register, control-failure surfacing, and a clear,
                audit-ready recommendation.
              </p>
            </Reveal>

            <Reveal delay={120}>
              <ul className="relative mt-10 grid gap-3 sm:grid-cols-2">
                {DELIVERS.map((d) => (
                  <li
                    key={d}
                    className="flex items-start gap-3 rounded-md border border-white/10 bg-white/[0.04] p-4 text-base leading-6 text-slate-100"
                  >
                    <span
                      aria-hidden
                      className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 ring-1 ring-indigo-300/40"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        aria-hidden
                      >
                        <path
                          d="M2.5 6.5L5 9l4.5-5.5"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                          className="text-indigo-200"
                        />
                      </svg>
                    </span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </section>

          {/* ================================================================
              BUILT FOR
          ================================================================ */}
          <section className="border-t border-white/10 pt-24">
            <Reveal>
              <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-start">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">
                    Built for
                  </p>
                  <h2 className="mt-4 text-3xl font-normal leading-[1.15] tracking-tight sm:text-5xl">
                    Capital allocators managing{" "}
                    <span className="text-slate-400">
                      AI compliance exposure.
                    </span>
                  </h2>
                </div>
                <ul className="space-y-3">
                  {BUILT_FOR.map((b) => (
                    <li
                      key={b}
                      className="flex gap-3 border-b border-white/10 pb-3 text-lg font-medium leading-8 text-slate-100 last:border-b-0"
                    >
                      <span
                        aria-hidden
                        className="mt-3 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-300"
                      />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </section>

          {/* ================================================================
              CTA / NDA
          ================================================================ */}
          <section className="border-t border-white/10 pt-24">
            <Reveal>
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">
                  Under NDA
                </p>
                <h2 className="mt-4 text-3xl font-normal leading-[1.15] tracking-tight sm:text-5xl">
                  The full methodology,{" "}
                  <span className="text-slate-400">
                    sub-criteria, framework mappings, and decision thresholds.
                  </span>
                </h2>
                <p className="mt-6 text-base leading-7 text-slate-300 sm:text-lg">
                  Kaptrix is an AI compliance platform. The full scoring
                  methodology — including sub-criteria, framework crosswalks,
                  weighting tiers, and decision thresholds — is available under
                  NDA.
                </p>
                <div className="mt-10 flex flex-wrap gap-3">
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center rounded-md bg-white px-6 py-3 text-base font-medium text-[#0B0B1A] transition hover:bg-[#F9FAFB]"
                  >
                    Request access
                  </Link>
                  <Link
                    href="/sample-report"
                    className="inline-flex items-center justify-center rounded-md border border-white/25 bg-transparent px-6 py-3 text-base font-medium text-white transition hover:bg-white/5"
                  >
                    See a sample report
                  </Link>
                </div>
              </div>
            </Reveal>
          </section>
        </div>
      </main>

      {/* ====================================================================
          FOOTER
      ==================================================================== */}
      <footer className="border-t border-white/10 bg-[#070815]">
        <div className="mx-auto max-w-6xl px-6 py-12 text-sm text-slate-400">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="text-sm font-semibold uppercase tracking-[0.32em] text-white">
              Kaptrix
            </span>
            <p>
              © {new Date().getFullYear()} Kaptrix · AI Compliance Platform
            </p>
            <div className="flex items-center gap-6">
              <Link
                href="/how-it-works"
                className="transition hover:text-white"
              >
                How it works
              </Link>
              <Link href="/framework" className="transition hover:text-white">
                Framework
              </Link>
              <Link href="/contact" className="transition hover:text-white">
                Contact
              </Link>
            </div>
          </div>
          <p className="mt-8 max-w-3xl text-xs leading-5 text-slate-500">
            Kaptrix is an advisory and technology practice. Engagements
            are governed by individual letters of engagement. Not legal,
            regulatory, or investment advice.
          </p>
        </div>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline node + connector — renders "Artifact → Proposal → Decision → Score"
// across one row on ≥sm and stacks vertically on mobile.
// ─────────────────────────────────────────────────────────────────────────────
function PipelineNode({
  step,
  hint,
  index,
  last,
}: {
  step: string;
  hint: string;
  index: number;
  last: boolean;
}) {
  return (
    <>
      <div className="relative rounded-xl border border-white/10 bg-white/[0.04] px-4 py-4">
        <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-indigo-300">
          Step {String(index + 1).padStart(2, "0")}
        </span>
        <p className="mt-2 text-base font-semibold text-white">{step}</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">{hint}</p>
      </div>
      {!last && (
        <div
          aria-hidden
          className="flex items-center justify-center text-indigo-300/60 sm:px-1"
        >
          {/* Horizontal arrow on ≥sm, vertical on mobile */}
          <svg
            className="hidden sm:block"
            width="24"
            height="16"
            viewBox="0 0 24 16"
            fill="none"
          >
            <path
              d="M0 8 H20 M15 3 L20 8 L15 13"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <svg
            className="sm:hidden"
            width="16"
            height="24"
            viewBox="0 0 16 24"
            fill="none"
          >
            <path
              d="M8 0 V20 M3 15 L8 20 L13 15"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Score-vs-confidence illustrative card. Bars are static visuals (not
// measurements) — they exist to show the two-signal separation.
// ─────────────────────────────────────────────────────────────────────────────
function ConfidenceCard({
  scoreLabel,
  scoreValue,
  confidenceLabel,
  confidenceValue,
  state,
  caption,
  accent,
}: {
  scoreLabel: string;
  scoreValue: number;
  confidenceLabel: string;
  confidenceValue: number;
  state: string;
  caption: string;
  accent: "amber" | "indigo";
}) {
  const accentClasses =
    accent === "amber"
      ? {
          pill: "border-amber-400/30 bg-amber-500/10 text-amber-200",
          confidenceBar: "bg-amber-300",
        }
      : {
          pill: "border-indigo-400/30 bg-indigo-500/10 text-indigo-200",
          confidenceBar: "bg-indigo-300",
        };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.2em] ${accentClasses.pill}`}
      >
        {state}
      </span>
      <div className="mt-5 space-y-4">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-[0.2em]">
              Score
            </span>
            <span className="font-mono text-slate-200">{scoreLabel}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-fuchsia-400"
              style={{ width: `${scoreValue}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-[0.2em]">
              Confidence
            </span>
            <span className="font-mono text-slate-200">{confidenceLabel}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full ${accentClasses.confidenceBar}`}
              style={{ width: `${confidenceValue}%` }}
            />
          </div>
        </div>
      </div>
      <p className="mt-5 text-sm leading-6 text-slate-300">{caption}</p>
    </div>
  );
}
