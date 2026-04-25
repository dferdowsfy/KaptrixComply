import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/home/public-header";
import { Reveal } from "@/components/home/reveal";

export const metadata: Metadata = {
  title: "How Kaptrix Works — AI Compliance Platform",
  description:
    "The compliance layer for companies that have to prove it.Structured scoring, evidence-driven adjustments, and a live reasoning surface that holds up under audit, regulator, and IC scrutiny.",
};

/* ──────────────────────────────────────────────────────────────────────────
   Content
   ────────────────────────────────────────────────────────────────────────── */

const PROBLEMS = [
  {
    title: "Policies don't operate themselves",
    body: "A pristine AI governance charter and an unmonitored production model can look identical on paper.",
  },
  {
    title: "Questionnaires anchor on assertion",
    body: "Vendors return a coherent control narrative. Coherence is not evidence.",
  },
  {
    title: "Workstreams fragment",
    body: "Privacy, security, AI governance, and legal review live in different workstreams. Nothing stitches them into a single compliance picture.",
  },
  {
    title: "AI systems fail in new ways",
    body: "Drift, hallucination, bias, prompt injection, untracked sub-processors, training-data provenance — traditional control frameworks weren't built to detect these.",
  },
];

const ENGINES = [
  {
    tag: "Engine 01",
    title: "Structured scoring engine",
    body: "The same inputs produce the same output, every time.",
  },
  {
    tag: "Engine 02",
    title: "Evidence engine",
    body: "Turns artifacts — policies, contracts, control tests, model cards, logs — into structured, machine-readable signals.",
  },
  {
    tag: "Engine 03",
    title: "Reasoning engine",
    body: "Operates continuously on top of both, grounded in what has actually been observed about this specific system.",
  },
];

const CORE_IDEA = [
  {
    title: "They summarize",
    body: "They read policies and produce a narrative. Fast, but non-defensible at audit.",
    tone: "neutral" as const,
  },
  {
    title: "They score by checklist",
    body: "They apply a static questionnaire. Defensible on paper, but blind to what the system is actually doing in production.",
    tone: "neutral" as const,
  },
  {
    title: "Kaptrix does neither in isolation",
    body: "A rubric-driven scoring engine runs underneath a live reasoning layer, with a strict separation between what the operator decides and what the AI contributes. The scoring logic is fixed and inspectable. The AI layer is bounded and auditable. Together they produce something both fast and defensible — a combination traditional compliance review and first-generation AI tools have not delivered.",
    tone: "accent" as const,
  },
];

const DIMENSIONS = [
  {
    id: "01",
    name: "Control Credibility",
    body: "Whether stated controls are actually operating, or whether the policy document is carrying the load.",
  },
  {
    id: "02",
    name: "Tooling & Vendor Exposure",
    body: "Which models, sub-processors, and third-party AI services sit in the data path, and whether the contracts and DPAs match the regulated data crossing those boundaries.",
  },
  {
    id: "03",
    name: "Data & Sensitivity Risk",
    body: "How regulated data is sourced, retained, processed, and disposed of in line with the regime that actually applies.",
  },
  {
    id: "04",
    name: "Governance & Accountability",
    body: "What controls exist when the system behaves badly, who owns them, and whether oversight is proportionate to the system's risk tier.",
  },
  {
    id: "05",
    name: "Operational Readiness",
    body: "Whether monitoring, logging, evaluation, and human-in-the-loop controls are instrumented in production, or only described in policy.",
  },
  {
    id: "06",
    name: "Open Validation",
    body: "What has been independently verified against applicable frameworks, and what remains untested.",
  },
];

const SCORING_PROPERTIES = [
  {
    title: "Scores are reproducible",
    body: "The same inputs produce the same output, every time. No model variance, no drift between runs, no \u201Cthe AI felt differently today.\u201D",
  },
  {
    title: "Failure-weighted, not feature-weighted",
    body: "A system that looks complete on the surface but is weak on control credibility cannot score its way out through strong peripheral signals.",
  },
  {
    title: "The operator assigns every base score",
    body: "The AI does not. This is a hard architectural constraint — not a configuration setting, not user-toggleable.",
  },
  {
    title: "Every score carries rationale",
    body: "Nothing is stored as a number alone. Every sub-criterion is accompanied by the reasoning that produced it.",
  },
];

const ARTIFACTS = [
  "Architecture diagrams",
  "Model & system cards",
  "Policies & standards",
  "Sub-processor lists & DPAs",
  "SOC / ISO reports",
  "Control test results",
  "Eval & red-team reports",
  "Audit logs & output samples",
];

const REASONING_QUESTIONS = [
  "Where is this system most likely to fail an audit?",
  "Which controls in the policy are unsupported by operating evidence?",
  "What is missing that the applicable framework — NIST AI RMF, ISO/IEC 42001, EU AI Act, SOC 2, HIPAA, GDPR — actually requires?",
  "How does this system compare to others we have assessed in the same regulatory category?",
  "Where has confidence in the score shifted since assessment began, and why?",
];

const EVIDENCE_KINDS = [
  {
    label: "Support",
    body: "Evidence that confirms an existing score.",
    accent: "emerald" as const,
    symbol: "=",
  },
  {
    label: "Contradiction",
    body: "Evidence that creates downward pressure.",
    accent: "rose" as const,
    symbol: "\u2193",
  },
  {
    label: "Augmentation",
    body: "Evidence that supports an upward signal.",
    accent: "indigo" as const,
    symbol: "\u2191",
  },
  {
    label: "Gap",
    body: "Missing evidence that should exist but does not.",
    accent: "amber" as const,
    symbol: "!",
  },
];

const DIFF_MANUAL = [
  "Defensible but slow",
  "Inconsistent across portcos and assessments",
  "Dependent on whichever reviewer knows AI best",
  "Scales poorly \u2014 every assessment starts from zero",
];

const DIFF_FIRSTGEN = [
  "Fast but shallow",
  "Map to checklists without structure",
  "No audit trail behind outputs",
  "No operator judgment inside outputs",
];

const DIFF_KAPTRIX = [
  "Structured human judgment",
  "Automated evidence extraction",
  "Rubric-driven scoring logic",
  "Full auditability",
  "Continuous reasoning that stays live throughout the assessment",
];

const BOUNDARIES = [
  {
    title: "Does not certify regulatory compliance",
    body: "Produces an evidence-based compliance posture. Certification, attestation, and legal opinion remain with auditors and counsel.",
  },
  {
    title: "Does not replace external audit or legal review",
    body: "Compresses the fragmented parts of AI-specific compliance into a structured layer the rest of the program can build on.",
  },
  {
    title: "Does not operate as a black-box autonomous evaluator",
    body: "The operator decides. The platform equips that decision.",
  },
  {
    title: "Does not accept claims it cannot trace",
    body: "If the evidence is not there, the gap is surfaced — not filled with inference.",
  },
];

const DELIVERABLES = [
  {
    id: "01",
    title: "Composite score",
    body: "Calibrated to failure-weighted compliance risk, with a full dimension-level breakdown.",
  },
  {
    id: "02",
    title: "Confidence signal",
    body: "Qualifies how much of the model is evidence-backed.",
  },
  {
    id: "03",
    title: "Evidence coverage map",
    body: "What has been validated and what has not, mapped against applicable frameworks.",
  },
  {
    id: "04",
    title: "Identified gaps & contradictions",
    body: "A structured view of control failures, policy-vs-practice gaps, and risks requiring follow-up.",
  },
  {
    id: "05",
    title: "Complete audit trail",
    body: "Linking every output to the artifacts and decisions that produced it.",
  },
  {
    id: "06",
    title: "Live reasoning surface",
    body: "Continues to answer questions during the assessment, at audit committee, before a regulator, and after remediation.",
  },
];

/* ──────────────────────────────────────────────────────────────────────────
   Page
   ────────────────────────────────────────────────────────────────────────── */

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[#070815] text-white">
      <PublicHeader />

      {/* ==================================================================
          HERO
      ================================================================== */}
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
              How Kaptrix Works
            </p>
            <h1 className="mt-6 max-w-4xl text-5xl font-light leading-[1.05] tracking-tight sm:text-6xl lg:text-[5.25rem]">
              The compliance layer for{" "}
              <span className="bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
                AI-driven systems.
              </span>
            </h1>
            <p className="mt-8 max-w-3xl text-lg leading-8 text-slate-100 sm:text-xl">
              Kaptrix is an AI compliance assessment and decision engine.
              It evaluates whether an AI-driven system is{" "}
              <strong className="font-semibold text-white">
                controlled, defensible, and audit-ready
              </strong>{" "}
              — based on evidence, not attestation.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                href="/preview"
                className="inline-flex items-center justify-center rounded-md bg-white px-6 py-3 text-base font-medium text-[#0B0B1A] transition hover:bg-[#F9FAFB]"
              >
                Open the platform preview
              </Link>
              <a
                href="#three-layers"
                className="inline-flex items-center justify-center rounded-md border border-white/25 bg-transparent px-6 py-3 text-base font-medium text-white transition hover:bg-white/5"
              >
                See the three layers →
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <main className="relative">
        {/* ambient backgrounds */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute left-1/2 top-[8%] h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-indigo-700/10 blur-[120px]" />
          <div className="absolute right-[-10%] top-[32%] h-[24rem] w-[24rem] rounded-full bg-fuchsia-600/10 blur-[120px]" />
          <div className="absolute left-[-10%] top-[60%] h-[24rem] w-[24rem] rounded-full bg-sky-500/10 blur-[120px]" />
          <div className="absolute right-[-6%] top-[85%] h-[22rem] w-[22rem] rounded-full bg-indigo-700/10 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-6xl space-y-28 px-6 py-24 sm:py-28">
          {/* ==============================================================
              THE PROBLEM
          ============================================================== */}
          <section>
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">
                The problem
              </p>
              <h2 className="mt-4 max-w-3xl text-3xl font-normal leading-[1.15] tracking-tight sm:text-5xl">
                AI compliance has a{" "}
                <span className="bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
                  structural blind spot.
                </span>
              </h2>
              <p className="mt-6 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
                Compliance review of AI-driven systems has a structural
                problem: the thing being evaluated is often the thing least
                visible in the policy library. Questionnaires assert. Policies
                describe. Vendors attest. The underlying system — models,
                sub-processors, data flows, controls, failure modes — sits
                behind a layer of documentation that traditional compliance
                review was not designed to penetrate.
              </p>
            </Reveal>

            <div className="mt-12 grid gap-4 sm:grid-cols-2">
              {PROBLEMS.map((p, i) => (
                <Reveal key={p.title} delay={i * 70}>
                  <div className="h-full rounded-xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-indigo-300/40 hover:bg-white/[0.05]">
                    <p className="text-base font-medium tracking-tight text-white">
                      {p.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {p.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={200}>
              <blockquote className="mt-10 rounded-2xl border border-indigo-300/20 bg-indigo-500/[0.06] p-6 text-base leading-7 text-slate-100 sm:p-8 sm:text-lg">
                <span
                  aria-hidden
                  className="mb-3 block h-[2px] w-10 bg-gradient-to-r from-indigo-400 to-fuchsia-400"
                />
                Kaptrix is built for the moment after that gap becomes
                visible. It gives compliance, risk, and capital teams a
                structured, evidence-backed view of whether an AI system is
                actually controlled — and a live reasoning surface to
                interrogate that view as new artifacts arrive.
              </blockquote>
            </Reveal>
          </section>

          {/* ==============================================================
              WHAT KAPTRIXCOMPLY IS — THREE ENGINES
          ============================================================== */}
          <section className="border-t border-white/10 pt-24">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">
                What Kaptrix is
              </p>
              <h2 className="mt-4 max-w-3xl text-3xl font-normal leading-[1.15] tracking-tight sm:text-5xl">
                Three engines.{" "}
                <span className="text-slate-400">One platform.</span>
              </h2>
              <p className="mt-6 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
                Kaptrix combines three things that don&apos;t usually
                coexist in a single platform. The operator owns the score. The
                AI expands what the operator can see.{" "}
                <strong className="font-semibold text-white">
                  Evidence, not opinion, is what moves anything.
                </strong>
              </p>
            </Reveal>

            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {ENGINES.map((e, i) => (
                <Reveal key={e.title} delay={i * 100}>
                  <article className="group relative h-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur-sm transition hover:border-indigo-300/40 hover:bg-white/[0.05]">
                    <span
                      aria-hidden
                      className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-transparent"
                    />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-indigo-300">
                      {e.tag}
                    </span>
                    <h3 className="mt-3 text-xl font-medium tracking-tight text-white">
                      {e.title}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      {e.body}
                    </p>
                  </article>
                </Reveal>
              ))}
            </div>
          </section>

          {/* ==============================================================
              THE CORE IDEA
          ============================================================== */}
          <section className="border-t border-white/10 pt-24">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">
                The core idea
              </p>
              <h2 className="mt-4 max-w-3xl text-3xl font-normal leading-[1.15] tracking-tight sm:text-5xl">
                Most AI compliance tools do{" "}
                <span className="text-slate-400">one of two things.</span>
              </h2>
            </Reveal>

            <div className="mt-12 grid gap-4 lg:grid-cols-3">
              {CORE_IDEA.map((c, i) => (
                <Reveal key={c.title} delay={i * 80}>
                  <div
                    className={`h-full rounded-2xl border p-6 transition ${
                      c.tone === "accent"
                        ? "border-indigo-300/30 bg-gradient-to-br from-indigo-500/[0.12] to-fuchsia-500/[0.08]"
                        : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
                    }`}
                  >
                    <p
                      className={`text-base font-medium tracking-tight ${
                        c.tone === "accent" ? "text-white" : "text-white"
                      }`}
                    >
                      {c.title}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      {c.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>

          {/* ==============================================================
              THREE LAYERS — ARCHITECTURE DIAGRAM + DETAIL
          ============================================================== */}
          <section id="three-layers" className="scroll-mt-24 border-t border-white/10 pt-24">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">
                The three layers
              </p>
              <h2 className="mt-4 max-w-3xl text-3xl font-normal leading-[1.15] tracking-tight sm:text-5xl">
                Coordinated. Bounded.{" "}
                <span className="text-slate-400">Each with a specific job.</span>
              </h2>
              <p className="mt-6 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
                Understanding the separation between the three layers is the
                key to understanding why the platform&apos;s outputs hold up
                under scrutiny.
              </p>
            </Reveal>

            {/* Architecture stack diagram */}
            <Reveal delay={120}>
              <div className="mt-12 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm sm:p-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                  Platform architecture
                </p>
                <div className="mt-6 space-y-3">
                  <LayerBar
                    order="03"
                    title="Reasoning engine"
                    subtitle="Continuous · context-aware · grounded"
                    tone="top"
                  />
                  <LayerBar
                    order="02"
                    title="Evidence engine"
                    subtitle="Artifact ingest · structured signal extraction"
                    tone="mid"
                  />
                  <LayerBar
                    order="01"
                    title="Scoring engine"
                    subtitle="Trust anchor · reproducible · operator-controlled"
                    tone="base"
                  />
                </div>
                <p className="mt-6 text-xs leading-5 text-slate-400">
                  Every layer above rolls up to — and is traceable back to —
                  the layer beneath it.
                </p>
              </div>
            </Reveal>

            {/* LAYER 01 — SCORING */}
            <div className="mt-16 space-y-6">
              <Reveal>
                <LayerHeader
                  order="Layer 01"
                  title="The Scoring Engine"
                  tagline="Auditable. Operator-controlled."
                />
                <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
                  This is the trust anchor. Every downstream output —
                  insights, comparisons, recommendations, control-failure
                  flags — rolls up to a score produced by a fixed, inspectable
                  process.
                </p>
              </Reveal>

              <Reveal delay={100}>
                <p className="mt-6 text-xs font-semibold uppercase tracking-[0.28em] text-indigo-300">
                  Six risk dimensions
                </p>
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {DIMENSIONS.map((d) => (
                    <div
                      key={d.id}
                      className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-indigo-300/40 hover:bg-white/[0.05]"
                    >
                      <div className="flex items-start gap-4">
                        <span
                          aria-hidden
                          className="text-3xl font-black tracking-tight text-white/10 transition group-hover:text-indigo-300/40"
                        >
                          {d.id}
                        </span>
                        <div>
                          <p className="text-base font-medium tracking-tight text-white">
                            {d.name}
                          </p>
                          <p className="mt-1.5 text-sm leading-6 text-slate-300">
                            {d.body}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Reveal>

              <Reveal delay={160}>
                <p className="mt-10 text-xs font-semibold uppercase tracking-[0.28em] text-indigo-300">
                  Four properties define how this layer behaves
                </p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {SCORING_PROPERTIES.map((prop) => (
                    <div
                      key={prop.title}
                      className="rounded-xl border border-white/10 bg-white/[0.03] p-5"
                    >
                      <p className="text-base font-medium tracking-tight text-white">
                        {prop.title}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        {prop.body}
                      </p>
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>

            {/* LAYER 02 — EVIDENCE */}
            <div className="mt-20 space-y-6">
              <Reveal>
                <LayerHeader
                  order="Layer 02"
                  title="The Evidence Engine"
                  tagline="Artifact-driven, not interview-driven."
                />
                <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
                  Traditional compliance review front-loads questionnaires and
                  management interviews because there is no better way to
                  surface hidden structure when starting from zero.
                  Kaptrix inverts this.
                </p>
                <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
                  Artifacts come first. The platform ingests them and extracts
                  structured signals:{" "}
                  <strong className="font-semibold text-white">
                    claims made, controls in place, dependencies declared,
                    gaps visible.
                  </strong>
                </p>
              </Reveal>

              <Reveal delay={120}>
                <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                    Artifacts ingested
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {ARTIFACTS.map((a) => (
                      <span
                        key={a}
                        className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-200"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                  <div className="mt-6 flex items-center gap-3 text-xs text-slate-400">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-indigo-400/30 bg-indigo-500/10 text-indigo-200">
                      →
                    </span>
                    <span>
                      Extracted into structured signals feeding the scoring
                      model.
                    </span>
                  </div>
                </div>
              </Reveal>

              <Reveal delay={180}>
                <p className="mt-8 text-base leading-7 text-slate-300 sm:text-lg">
                  The effect: management interviews become{" "}
                  <em>targeted follow-up</em> rather than{" "}
                  <em>primary discovery</em>. You walk into the control
                  walkthrough already knowing what is missing, what is
                  inconsistent, and what needs pressure.
                </p>
              </Reveal>
            </div>

            {/* LAYER 03 — REASONING */}
            <div className="mt-20 space-y-6">
              <Reveal>
                <LayerHeader
                  order="Layer 03"
                  title="The Reasoning Engine"
                  tagline="Continuous. Grounded. Context-aware."
                />
                <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
                  This is the layer most compliance tools lack entirely, and
                  it is what makes Kaptrix a live system rather than a
                  report generator.
                </p>
              </Reveal>

              <Reveal delay={120}>
                <p className="mt-6 text-xs font-semibold uppercase tracking-[0.28em] text-indigo-300">
                  Questions it answers in context
                </p>
                <ul className="mt-5 space-y-3">
                  {REASONING_QUESTIONS.map((q) => (
                    <li
                      key={q}
                      className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4"
                    >
                      <span
                        aria-hidden
                        className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-indigo-400/30 bg-indigo-500/10 text-[10px] font-semibold text-indigo-200"
                      >
                        ?
                      </span>
                      <span className="text-sm leading-6 text-slate-200">
                        {q}
                      </span>
                    </li>
                  ))}
                </ul>
              </Reveal>

              <Reveal delay={180}>
                <p className="mt-6 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
                  Outputs are grounded. No generic answers. No hallucinated
                  confidence. If the evidence does not support a conclusion,
                  the engine says so — and flags it as a gap to close, not a
                  question to paper over.
                </p>
              </Reveal>
            </div>
          </section>

          {/* ==============================================================
              HOW EVIDENCE CHANGES A SCORE
          ============================================================== */}
          <section className="border-t border-white/10 pt-24">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">
                How evidence changes a score
              </p>
              <h2 className="mt-4 max-w-3xl text-3xl font-normal leading-[1.15] tracking-tight sm:text-5xl">
                Evidence never silently{" "}
                <span className="text-slate-400">modifies a score.</span>
              </h2>
              <p className="mt-6 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
                When the platform ingests a new artifact and extracts a signal
                that affects the model, it generates a structured{" "}
                <strong className="font-semibold text-white">proposal</strong>.
                That proposal names the sub-criterion it affects, the
                direction of the pressure it creates, the rationale behind it,
                and the supporting artifacts.
              </p>
            </Reveal>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {EVIDENCE_KINDS.map((k, i) => (
                <Reveal key={k.label} delay={i * 80}>
                  <EvidenceCard {...k} />
                </Reveal>
              ))}
            </div>

            <Reveal delay={200}>
              <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-300">
                  Bounded. Reviewed. Approved.
                </p>
                <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
                  <li className="flex gap-3">
                    <span
                      aria-hidden
                      className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-300"
                    />
                    <span>
                      A single piece of evidence cannot move a score by an
                      arbitrary amount. Evidence affecting one dimension
                      cannot bleed into another. These are enforced at the
                      engine level, not left to operator discipline.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span
                      aria-hidden
                      className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-300"
                    />
                    <span>
                      Proposals are reviewed and approved by the operator
                      before they affect the score. Nothing enters the
                      composite without a human decision.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span
                      aria-hidden
                      className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-300"
                    />
                    <span>
                      The result is a scoring model that stays <em>live</em> —
                      continuously updated as new artifacts arrive — while
                      remaining <em>controlled</em>.
                    </span>
                  </li>
                </ul>
              </div>
            </Reveal>
          </section>

          {/* ==============================================================
              CONFIDENCE vs SCORE
          ============================================================== */}
          <section className="border-t border-white/10 pt-24">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">
                Confidence is separate from score
              </p>
              <h2 className="mt-4 max-w-3xl text-3xl font-normal leading-[1.15] tracking-tight sm:text-5xl">
                A score tells you where the system landed.{" "}
                <span className="text-slate-400">
                  Confidence tells you how much to trust that landing.
                </span>
              </h2>
              <p className="mt-6 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
                Kaptrix calculates confidence independently from the
                score itself — based on how much of the model is covered by
                evidence, the quality of the sources feeding it, how recent
                the evidence is, and how consistent the signals are with each
                other.{" "}
                <strong className="font-semibold text-white">
                  Confidence qualifies the score. It does not override it.
                </strong>
              </p>
            </Reveal>

            <Reveal delay={160}>
              <div className="mt-12 grid gap-5 sm:grid-cols-2">
                <ConfidenceCard
                  scoreLabel="4.0 / 5.0"
                  scoreValue={80}
                  confidenceLabel="0.42"
                  confidenceValue={42}
                  state="Soft signal"
                  headline="High score, low confidence"
                  caption="The evidence we have is positive, but we have not seen enough."
                  accent="amber"
                />
                <ConfidenceCard
                  scoreLabel="4.0 / 5.0"
                  scoreValue={80}
                  confidenceLabel="0.86"
                  confidenceValue={86}
                  state="Strong signal"
                  headline="High score, high confidence"
                  caption="We have seen enough, and it holds up."
                  accent="indigo"
                />
              </div>
            </Reveal>

            <Reveal delay={240}>
              <p className="mt-8 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
                Audit committees, regulators, and counsel need to be able to
                tell these two states apart. Kaptrix makes that
                distinction visible, explicit, and reviewable.
              </p>
            </Reveal>
          </section>

          {/* ==============================================================
              WHY THIS HOLDS UP — AUDIT TRAIL
          ============================================================== */}
          <section className="border-t border-white/10 pt-24">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">
                Why this holds up under scrutiny
              </p>
              <h2 className="mt-4 max-w-3xl text-3xl font-normal leading-[1.15] tracking-tight sm:text-5xl">
                Every output can be walked backwards{" "}
                <span className="text-slate-400">to its source.</span>
              </h2>
              <p className="mt-6 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
                When an auditor, an audit committee, a regulator, an LP, or
                counsel asks <em>how did you arrive at this view</em>, the
                answer needs to be traceable.
              </p>
            </Reveal>

            {/* Trace diagram */}
            <Reveal delay={120}>
              <div className="mt-12 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm sm:p-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                  Trace chain
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] sm:items-center">
                  {[
                    { step: "Artifact", hint: "Source of truth" },
                    { step: "Signal", hint: "Structured extraction" },
                    { step: "Proposal", hint: "Named, bounded, reasoned" },
                    { step: "Score impact", hint: "After operator approval" },
                  ].map((n, i, arr) => (
                    <PipelineNode
                      key={n.step}
                      step={n.step}
                      hint={n.hint}
                      index={i}
                      last={i === arr.length - 1}
                    />
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={180}>
              <ul className="mt-10 space-y-3">
                {[
                  "Every score traces to its sub-criteria and the rationale behind them.",
                  "Every adjustment traces to the proposal that triggered it and the artifact that supported it.",
                  "Every AI-generated insight traces to the signals and evidence it drew from.",
                  "No scoring logic is hidden. No adjustments happen silently. No conclusions float free of their evidence base.",
                ].map((t) => (
                  <li
                    key={t}
                    className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-slate-200 sm:text-base sm:leading-7"
                  >
                    <span
                      aria-hidden
                      className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 ring-1 ring-indigo-300/40"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
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
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={260}>
              <blockquote className="mt-10 rounded-2xl border border-indigo-300/20 bg-indigo-500/[0.06] p-6 text-base leading-7 text-slate-100 sm:p-8 sm:text-lg">
                <span
                  aria-hidden
                  className="mb-3 block h-[2px] w-10 bg-gradient-to-r from-indigo-400 to-fuchsia-400"
                />
                The audit trail is not a feature bolted on afterward — it is
                the structure the platform is built on. If a conclusion cannot
                be traced to its source, it is not a conclusion Kaptrix
                will present.
              </blockquote>
            </Reveal>
          </section>

          {/* ==============================================================
              DIFFERENTIATORS — 3 COLUMN COMPARISON
          ============================================================== */}
          <section className="border-t border-white/10 pt-24">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">
                What makes Kaptrix different
              </p>
              <h2 className="mt-4 max-w-3xl text-3xl font-normal leading-[1.15] tracking-tight sm:text-5xl">
                Two existing approaches.{" "}
                <span className="text-slate-400">
                  Each with structural limits.
                </span>
              </h2>
            </Reveal>

            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              <Reveal delay={0}>
                <ComparisonColumn
                  label="Manual compliance review"
                  tone="muted"
                  items={DIFF_MANUAL}
                />
              </Reveal>
              <Reveal delay={100}>
                <ComparisonColumn
                  label="First-gen AI compliance tools"
                  tone="muted"
                  items={DIFF_FIRSTGEN}
                />
              </Reveal>
              <Reveal delay={200}>
                <ComparisonColumn
                  label="Kaptrix"
                  tone="accent"
                  items={DIFF_KAPTRIX}
                />
              </Reveal>
            </div>

            <Reveal delay={280}>
              <p className="mt-10 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
                Faster than traditional compliance review, more structured
                than ad hoc questionnaire workflows, more defensible than pure
                AI output.
              </p>
            </Reveal>
          </section>

          {/* ==============================================================
              BOUNDARIES — WHAT IT WILL NOT DO
          ============================================================== */}
          <section className="border-t border-white/10 pt-24">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">
                What Kaptrix will not do
              </p>
              <h2 className="mt-4 max-w-3xl text-3xl font-normal leading-[1.15] tracking-tight sm:text-5xl">
                Trust also comes from knowing{" "}
                <span className="text-slate-400">where a system stops.</span>
              </h2>
            </Reveal>

            <ul className="mt-12 space-y-4">
              {BOUNDARIES.map((b, i) => (
                <Reveal key={b.title} delay={i * 70}>
                  <li className="flex items-start gap-5 rounded-xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-white/20">
                    <span
                      aria-hidden
                      className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-rose-400/30 bg-rose-500/10 text-rose-200"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        aria-hidden
                        fill="none"
                      >
                        <path
                          d="M3 3l8 8M11 3l-8 8"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                    <div>
                      <p className="text-base font-medium tracking-tight text-white sm:text-lg">
                        {b.title}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
                        {b.body}
                      </p>
                    </div>
                  </li>
                </Reveal>
              ))}
            </ul>
          </section>

          {/* ==============================================================
              DELIVERABLES
          ============================================================== */}
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
                What you get
              </p>
              <h2 className="mt-4 max-w-3xl text-3xl font-normal leading-[1.1] tracking-tight sm:text-5xl">
                When the{" "}
                <span className="bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
                  assessment concludes.
                </span>
              </h2>
            </Reveal>

            <Reveal delay={120}>
              <div className="relative mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {DELIVERABLES.map((d) => (
                  <div
                    key={d.id}
                    className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-indigo-300/40 hover:bg-white/[0.07]"
                  >
                    <span
                      aria-hidden
                      className="text-4xl font-black tracking-tight text-white/10 transition group-hover:text-indigo-200/40"
                    >
                      {d.id}
                    </span>
                    <p className="mt-2 text-base font-medium tracking-tight text-white">
                      {d.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-200">
                      {d.body}
                    </p>
                  </div>
                ))}
              </div>
            </Reveal>
          </section>

          {/* ==============================================================
              THE SHIFT — BEFORE / AFTER
          ============================================================== */}
          <section className="border-t border-white/10 pt-24">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">
                The shift
              </p>
              <h2 className="mt-4 max-w-3xl text-3xl font-normal leading-[1.15] tracking-tight sm:text-5xl">
                Small on the surface.{" "}
                <span className="text-slate-400">Large in practice.</span>
              </h2>
              <p className="mt-6 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
                Kaptrix moves the central question of AI compliance from
                one with no defensible answer to one that does.
              </p>
            </Reveal>

            <div className="mt-12 grid gap-5 lg:grid-cols-2">
              <Reveal delay={80}>
                <div className="h-full rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
                  <span className="inline-flex items-center rounded-full border border-rose-400/30 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-200">
                    Before
                  </span>
                  <p className="mt-5 text-xl font-light leading-8 text-white sm:text-2xl">
                    &ldquo;Do we attest this system is compliant?&rdquo;
                  </p>
                </div>
              </Reveal>
              <Reveal delay={160}>
                <div className="h-full rounded-2xl border border-indigo-300/30 bg-gradient-to-br from-indigo-500/[0.12] to-fuchsia-500/[0.08] p-6 sm:p-8">
                  <span className="inline-flex items-center rounded-full border border-indigo-300/40 bg-indigo-500/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-100">
                    After
                  </span>
                  <p className="mt-5 text-xl font-light leading-8 text-white sm:text-2xl">
                    &ldquo;What evidence supports each control, what
                    contradicts it, and how much regulatory risk remains?&rdquo;
                  </p>
                </div>
              </Reveal>
            </div>

            <Reveal delay={240}>
              <p className="mt-10 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
                Kaptrix is built to answer the second question in real
                time, with full context, and with logic you can defend — in
                front of an audit committee, a regulator, a board, or an LP.
              </p>
            </Reveal>
          </section>

          {/* ==============================================================
              CTA
          ============================================================== */}
          <section className="border-t border-white/10 pt-24">
            <Reveal>
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">
                  Built for high-stakes evaluation
                </p>
                <h2 className="mt-4 text-3xl font-normal leading-[1.15] tracking-tight sm:text-5xl">
                  For the moments where the answer has to be right{" "}
                  <span className="text-slate-400">
                    and the reasoning has to hold up.
                  </span>
                </h2>
                <p className="mt-6 text-base leading-7 text-slate-300 sm:text-lg">
                  Portfolio AI compliance review. Pre-acquisition AI compliance
                  assessment. Validation of vendor AI compliance claims.
                  Assessment of internal AI initiatives where regulatory and
                  capital exposure intersect.
                </p>
                <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">
                  Most valuable when decisions must be made quickly,
                  documentation is incomplete or contradictory, and control
                  claims need to be pressure-tested against operating evidence.
                </p>
                <div className="mt-10 flex flex-wrap gap-3">
                  <Link
                    href="/preview"
                    className="inline-flex items-center justify-center rounded-md bg-white px-6 py-3 text-base font-medium text-[#0B0B1A] transition hover:bg-[#F9FAFB]"
                  >
                    Open the platform preview
                  </Link>
                  <Link
                    href="/framework"
                    className="inline-flex items-center justify-center rounded-md border border-white/25 bg-transparent px-6 py-3 text-base font-medium text-white transition hover:bg-white/5"
                  >
                    See the framework →
                  </Link>
                </div>
              </div>
            </Reveal>
          </section>
        </div>
      </main>

      {/* ==================================================================
          FOOTER
      ================================================================== */}
      <footer className="border-t border-white/10 bg-[#070815]">
        <div className="mx-auto max-w-6xl px-6 py-12 text-sm text-slate-400">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="text-sm font-semibold uppercase tracking-[0.32em] text-white">
              Kaptrix
            </span>
            <p>© {new Date().getFullYear()} Kaptrix · AI Compliance Platform</p>
            <div className="flex items-center gap-6">
              <Link href="/preview" className="transition hover:text-white">
                Platform
              </Link>
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

/* ──────────────────────────────────────────────────────────────────────────
   Building blocks
   ────────────────────────────────────────────────────────────────────────── */

function LayerBar({
  order,
  title,
  subtitle,
  tone,
}: {
  order: string;
  title: string;
  subtitle: string;
  tone: "top" | "mid" | "base";
}) {
  const styles =
    tone === "top"
      ? "border-fuchsia-300/30 bg-gradient-to-r from-fuchsia-500/15 via-indigo-500/15 to-indigo-500/5"
      : tone === "mid"
        ? "border-indigo-300/30 bg-gradient-to-r from-indigo-500/15 via-indigo-500/10 to-sky-500/5"
        : "border-sky-300/30 bg-gradient-to-r from-sky-500/15 via-sky-500/10 to-indigo-500/5";
  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-xl border p-5 ${styles}`}
    >
      <div className="flex items-center gap-4">
        <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-indigo-200">
          {order}
        </span>
        <div>
          <p className="text-base font-medium tracking-tight text-white">
            {title}
          </p>
          <p className="text-xs text-slate-300">{subtitle}</p>
        </div>
      </div>
      <span
        aria-hidden
        className="hidden h-2 w-24 rounded-full bg-white/10 sm:block"
      >
        <span
          className={`block h-full rounded-full ${
            tone === "top"
              ? "w-3/4 bg-fuchsia-300"
              : tone === "mid"
                ? "w-1/2 bg-indigo-300"
                : "w-1/3 bg-sky-300"
          }`}
        />
      </span>
    </div>
  );
}

function LayerHeader({
  order,
  title,
  tagline,
}: {
  order: string;
  title: string;
  tagline: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-indigo-300">
        {order}
      </p>
      <h3 className="mt-3 text-2xl font-medium tracking-tight text-white sm:text-3xl">
        {title}
      </h3>
      <p className="mt-2 text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
        {tagline}
      </p>
    </div>
  );
}

function EvidenceCard({
  label,
  body,
  accent,
  symbol,
}: {
  label: string;
  body: string;
  accent: "emerald" | "rose" | "indigo" | "amber";
  symbol: string;
}) {
  const styles = {
    emerald: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
    rose: "border-rose-400/30 bg-rose-500/10 text-rose-200",
    indigo: "border-indigo-400/30 bg-indigo-500/10 text-indigo-200",
    amber: "border-amber-400/30 bg-amber-500/10 text-amber-200",
  }[accent];
  return (
    <div className="h-full rounded-xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/20 hover:bg-white/[0.05]">
      <span
        className={`inline-flex h-9 w-9 items-center justify-center rounded-md border text-base font-bold ${styles}`}
        aria-hidden
      >
        {symbol}
      </span>
      <p className="mt-4 text-base font-medium tracking-tight text-white">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
    </div>
  );
}

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

function ConfidenceCard({
  scoreLabel,
  scoreValue,
  confidenceLabel,
  confidenceValue,
  state,
  headline,
  caption,
  accent,
}: {
  scoreLabel: string;
  scoreValue: number;
  confidenceLabel: string;
  confidenceValue: number;
  state: string;
  headline: string;
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
      <p className="mt-4 text-lg font-medium tracking-tight text-white">
        {headline}
      </p>
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

function ComparisonColumn({
  label,
  items,
  tone,
}: {
  label: string;
  items: string[];
  tone: "muted" | "accent";
}) {
  const isAccent = tone === "accent";
  return (
    <div
      className={`h-full rounded-2xl border p-6 sm:p-7 ${
        isAccent
          ? "border-indigo-300/30 bg-gradient-to-br from-indigo-500/[0.14] to-fuchsia-500/[0.08]"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <p
        className={`text-[11px] font-semibold uppercase tracking-[0.28em] ${
          isAccent ? "text-indigo-100" : "text-slate-400"
        }`}
      >
        {label}
      </p>
      <ul className="mt-5 space-y-3">
        {items.map((it) => (
          <li
            key={it}
            className="flex items-start gap-3 text-sm leading-6 text-slate-200 sm:text-base sm:leading-7"
          >
            <span
              aria-hidden
              className={`mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                isAccent ? "bg-indigo-200" : "bg-slate-500"
              }`}
            />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
