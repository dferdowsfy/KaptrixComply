import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/home/logo";
import { Reveal } from "@/components/home/reveal";
import { PublicHeader } from "@/components/home/public-header";
import { ComplyShowcase } from "@/components/home/comply-showcase";
import { ScrollToTop } from "@/components/home/scroll-to-top";

export const metadata: Metadata = {
  title: "KaptrixComply | Evidence-backed vendor compliance, automated",
  description:
    "AI-assisted compliance questionnaires. Upload vendor evidence, auto-fill SOC 2, ISO 27001, NIST CSF and HIPAA controls, and export audit-ready reports with a cited passage behind every answer.",
};

// ---------------------------------------------------------------------------
// Visual system (unchanged): Stripe / Linear restraint.
// Primary CTA #0B0B1A · Secondary white/border · Accent indigo #6B5BFF.
// ---------------------------------------------------------------------------

const HERO_PROOF = [
  "Every answer traced back to a cited passage in the vendor's evidence pack.",
  "SOC 2, ISO 27001, NIST CSF, HIPAA, PCI DSS and custom templates — out of the box.",
  "Rationale and confidence on every control, exportable to an audit-ready PDF.",
];

const COST_OF_WRONG = [
  "Compliance officers spend weeks copying answers out of SOC 2 reports and policy PDFs.",
  "Controls get approved without a citation — until an auditor asks where the evidence lived.",
  "Every new framework resets the work; the same vendor evidence gets reviewed from scratch.",
  "Third-party risk slips through when questionnaires get skimmed instead of scored.",
];

const HOW_IT_WORKS = [
  {
    id: "01",
    step: "Ingest",
    line: "Upload vendor policies, SOC 2 reports, DPAs, and questionnaire responses — parsed and indexed as the evidence pack.",
  },
  {
    id: "02",
    step: "Extract",
    line: "AI maps each control to the strongest supporting passage and returns a draft answer, rationale, and confidence score.",
  },
  {
    id: "03",
    step: "Review & export",
    line: "Your officer reviews each rationale, accepts or edits, then exports a decision-grade compliance report with full citations.",
  },
];

const DELIVERABLES = [
  {
    name: "Answered Questionnaire",
    what: "Complete framework response — every control filled with a draft answer, cited passage, and confidence score.",
    why: "The work product that used to take weeks, drafted in minutes — ready for your officer to review, not transcribe.",
  },
  {
    name: "AI Rationale Report",
    what: "Per-control reasoning explaining why the AI answered the way it did, grounded in the vendor's own evidence.",
    why: "Auditors don't ask for answers — they ask how you got there. This is that paper trail.",
  },
  {
    name: "Evidence Pack Index",
    what: "Every uploaded document, indexed with the passages it supports and the controls it satisfies.",
    why: "Instantly find the SOC 2 section or policy paragraph an answer depends on, without re-reading the report.",
  },
  {
    name: "Control Coverage Summary",
    what: "Framework-level KPIs: auto-filled, partial, and missing — broken down by control category.",
    why: "Know the moment an engagement is review-ready, and where the vendor still owes evidence.",
  },
  {
    name: "Audit-Ready PDF",
    what: "Presentable, print-styled compliance report with cover page, rationale summary, and cited evidence for every answer.",
    why: "The document you hand to the auditor, the board, or the customer — defensible on its own.",
  },
];

const DIFFERENTIATION = [
  "Evidence-backed — no answer ships without a passage from the vendor's own documents cited behind it.",
  "Framework-native — SOC 2, ISO 27001, NIST CSF, HIPAA, PCI DSS, and your internal questionnaires.",
  "Auditor-defensible — rationale and confidence on every control, exportable to a print-ready PDF.",
  "Officer-in-the-loop — AI drafts, your reviewer decides; no answer is final until it's accepted.",
  "Private by design — vendor evidence stays in your workspace. Zero-retention LLM providers, no training on your data.",
];

const EXECUTION_BULLETS = [
  "Draft answers auto-populated with the strongest matching evidence snippet already cited.",
  "Confidence scoring so reviewers instantly see which controls need a closer read.",
  "Plain-English rationale per control — no prompt engineering, no black box.",
  "One-click audit-ready PDF: cover page, KPI coverage, per-control rationale, evidence trail.",
];

const MOAT_BULLETS = [
  "Every reviewed engagement sharpens your index of what good evidence looks like for your frameworks.",
  "Patterns across vendors, controls, and audit cycles carry from engagement to engagement.",
  "Reusable templates and historical answers shrink the next questionnaire before it starts.",
  "Your workspace never leaks — vendor evidence stays yours, and the LLM never trains on it.",
];

const MARQUEE = [
  "Evidence-backed",
  "Auditor-defensible",
  "Framework-native",
  "SOC 2 · ISO 27001 · NIST CSF",
  "HIPAA · PCI DSS",
  "Rationale-first",
  "Officer-in-the-loop",
  "Zero-retention LLM",
];

const BTN_PRIMARY =
  "inline-flex items-center justify-center rounded-md bg-[#0B0B1A] px-6 py-3 text-base font-medium text-white transition hover:bg-[#1F1F2E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B0B1A]";
const BTN_SECONDARY =
  "inline-flex items-center justify-center rounded-md border border-[#E5E7EB] bg-white px-6 py-3 text-base font-medium text-[#0B0B1A] transition hover:bg-[#F9FAFB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B0B1A]";
const BTN_PRIMARY_ON_DARK =
  "inline-flex items-center justify-center rounded-md bg-white px-6 py-3 text-base font-medium text-[#0B0B1A] transition hover:bg-[#F9FAFB]";
const BTN_SECONDARY_ON_DARK =
  "inline-flex items-center justify-center rounded-md border border-white/25 bg-transparent px-6 py-3 text-base font-medium text-white transition hover:bg-white/5";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-[#0B0B1A]">
      <ScrollToTop />
      <PublicHeader />

      {/* ====================================================================
          1. HERO
      ==================================================================== */}
      <section className="relative overflow-hidden bg-[radial-gradient(ellipse_at_top_right,#1B1F4A_0%,#0D1033_35%,#0A0B1F_65%,#070815_100%)] text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-indigo-500/20 blur-[100px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 bottom-0 h-[18rem] w-[18rem] rounded-full bg-sky-500/10 blur-[100px]"
        />
        <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-28 sm:pt-32 lg:pb-28">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">
              AI-assisted vendor compliance
            </p>
            <h1 className="mt-6 max-w-4xl text-5xl font-light leading-[1.05] tracking-tight sm:text-6xl lg:text-[5.25rem] kx-fade-in">
              Vendor questionnaires,
              <br />
              <span className="bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
                answered with evidence.
              </span>
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-100 sm:text-xl">
              KaptrixComply ingests a vendor&apos;s policies and audit reports,
              auto-fills SOC 2, ISO 27001, NIST CSF and HIPAA controls, and
              cites the exact source passage behind every answer — so reviews
              go from weeks of transcription to hours of sign-off.
            </p>

            <ul className="mt-8 space-y-2.5">
              {HERO_PROOF.map((p) => (
                <li
                  key={p}
                  className="flex items-start gap-3 text-base leading-7 text-slate-100 sm:text-lg"
                >
                  <span
                    aria-hidden
                    className="mt-2.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-300"
                  />
                  <span>{p}</span>
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link href="/contact" className={BTN_PRIMARY_ON_DARK}>
                Start a compliance engagement
              </Link>
              <Link href="/how-it-works" className={BTN_SECONDARY_ON_DARK}>
                How it works
              </Link>
            </div>
          </Reveal>
        </div>

        <div className="marquee relative border-t border-white/10 bg-[#070815] py-4">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-[#070815] to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-[#070815] to-transparent"
          />
          <div className="marquee-track text-xs font-medium uppercase tracking-[0.32em] text-slate-300 sm:text-sm">
            {MARQUEE.map((word, i) => (
              <span key={i} className="inline-flex items-center">
                <span>{word}</span>
                {i < MARQUEE.length - 1 && (
                  <span
                    aria-hidden
                    className="ml-6 inline-block h-1 w-1 rounded-full bg-indigo-400/60"
                  />
                )}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================================
          2. THE COST OF BEING WRONG
      ==================================================================== */}
      <section className="border-b border-[#E5E7EB] bg-[#FAFAFA]">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-28">
          <Reveal>
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6B5BFF]">
                The cost of manual review
              </p>
              <h2 className="mt-4 text-3xl font-normal leading-[1.15] tracking-tight text-[#0B0B1A] sm:text-5xl">
                Compliance moves slow.{" "}
                <span className="text-slate-600">Auditors don&apos;t.</span>
              </h2>
            </div>
          </Reveal>

          <ul className="mt-12 grid gap-4 sm:grid-cols-2">
            {COST_OF_WRONG.map((b, i) => (
              <Reveal key={i} delay={i * 80}>
                <li className="kx-sub-sm flex gap-3 rounded-lg border border-[#E5E7EB] border-l-[3px] border-l-[#6B5BFF] bg-white p-5 shadow-[0_1px_2px_rgba(11,11,26,0.04)] transition hover:border-l-[#0B0B1A] hover:shadow-[0_4px_12px_-4px_rgba(11,11,26,0.08)]">
                  <span
                    aria-hidden
                    className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-[#6B5BFF]"
                  />
                  <span>{b}</span>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <main className="mx-auto max-w-6xl space-y-28 px-6 py-24 sm:py-28">
        {/* ================================================================
            3. WHAT KAPTRIX DOES
        ================================================================ */}
        <section>
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6B5BFF]">
              What KaptrixComply does
            </p>
            <h2 className="mt-4 max-w-3xl text-3xl font-normal leading-[1.15] tracking-tight text-[#0B0B1A] sm:text-5xl">
              A review system.{" "}
              <span className="text-slate-600">Not a template generator.</span>
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {[
              {
                id: "01",
                title: "Ingests the evidence pack",
                body: "SOC 2 reports, ISO certifications, policies, DPAs, and vendor-completed questionnaires — parsed and indexed as the source of truth.",
              },
              {
                id: "02",
                title: "Auto-fills the questionnaire",
                body: "Each control is matched to its strongest supporting passage; a draft answer, cited snippet, and confidence score are written back.",
              },
              {
                id: "03",
                title: "Explains every answer",
                body: "Plain-English rationale for each control — reviewers see why the AI answered the way it did before they accept or edit it.",
              },
              {
                id: "04",
                title: "Exports an audit-ready report",
                body: "One-click PDF with cover page, KPI coverage, per-control rationale, and cited evidence — defensible in front of an auditor.",
              },
            ].map((layer, idx) => (
              <Reveal key={layer.id} delay={idx * 90}>
                <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-[#E5E7EB] bg-white p-7 shadow-[0_1px_2px_rgba(11,11,26,0.04)] transition hover:border-[#0B0B1A] hover:shadow-[0_8px_24px_-12px_rgba(11,11,26,0.12)]">
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[#6B5BFF] via-indigo-400 to-transparent"
                  />
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-indigo-100 bg-indigo-50 text-sm font-semibold text-[#6B5BFF]">
                    {layer.id}
                  </span>
                  <h3 className="mt-5 text-xl font-medium tracking-tight text-[#0B0B1A]">
                    {layer.title}
                  </h3>
                  <p className="kx-sub mt-3">{layer.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ================================================================
            4. HOW IT WORKS — 3 steps
        ================================================================ */}
        <section className="border-t border-[#E5E7EB] pt-24">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6B5BFF]">
              How it works
            </p>
            <h2 className="mt-4 max-w-3xl text-3xl font-normal leading-[1.15] tracking-tight text-[#0B0B1A] sm:text-5xl">
              Ingest.{" "}
              <span className="text-slate-600">Extract. Review.</span>
            </h2>
          </Reveal>

          <ol className="mt-12 grid gap-6 lg:grid-cols-3">
            {HOW_IT_WORKS.map((s, idx) => (
              <Reveal key={s.id} delay={idx * 90}>
                <li className="flex h-full flex-col rounded-lg border border-[#E5E7EB] bg-white p-7 shadow-[0_1px_2px_rgba(11,11,26,0.04)]">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[#0B0B1A] text-sm font-semibold text-white">
                      {s.id}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                      {s.step}
                    </span>
                  </div>
                  <p className="kx-sub mt-5">{s.line}</p>
                </li>
              </Reveal>
            ))}
          </ol>

          <ComplyShowcase />
        </section>

        {/* ================================================================
            5. OUTPUTS
        ================================================================ */}
        <section className="border-t border-[#E5E7EB] pt-24">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6B5BFF]">
              Outputs
            </p>
            <h2 className="mt-4 max-w-3xl text-3xl font-normal leading-[1.15] tracking-tight text-[#0B0B1A] sm:text-5xl">
              What lands on your desk.{" "}
              <span className="text-slate-600">Cited. Auditable. Exportable.</span>
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-4 lg:grid-cols-2">
            {DELIVERABLES.map((d, i) => (
              <Reveal key={d.name} delay={i * 80}>
                <article className="flex h-full flex-col rounded-lg border border-[#E5E7EB] bg-white p-7 shadow-[0_1px_2px_rgba(11,11,26,0.04)] transition hover:border-[#0B0B1A] hover:shadow-[0_8px_24px_-12px_rgba(11,11,26,0.10)]">
                  <div className="mb-4 flex items-center gap-3">
                    <span
                      aria-hidden
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-indigo-100 bg-indigo-50 text-xs font-semibold text-[#6B5BFF]"
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                      Deliverable
                    </span>
                  </div>
                  <h3 className="text-xl font-medium tracking-tight text-[#0B0B1A]">
                    {d.name}
                  </h3>
                  <p className="kx-sub-sm mt-3">
                    <span className="font-semibold text-[#0B0B1A]">What:{" "}</span>
                    {d.what}
                  </p>
                  <p className="kx-sub-sm mt-3 border-t border-[#E5E7EB] pt-4">
                    <span className="font-semibold text-[#0B0B1A]">Why it matters:{" "}</span>
                    {d.why}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>

          <Reveal delay={120}>
            <div className="mt-10">
              <Link href="/sample-report" className={BTN_PRIMARY}>
                See a sample report
              </Link>
            </div>
          </Reveal>
        </section>

        {/* ================================================================
            6. DIFFERENTIATION
        ================================================================ */}
        <section className="border-t border-[#E5E7EB] pt-24">
          <Reveal>
            <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6B5BFF]">
                  Why KaptrixComply
                </p>
                <h2 className="mt-4 text-3xl font-normal leading-[1.15] tracking-tight text-[#0B0B1A] sm:text-5xl">
                  Not another GRC suite.{" "}
                  <span className="text-slate-600">Not another chatbot.</span>
                </h2>
              </div>
              <ul className="space-y-3">
                {DIFFERENTIATION.map((b, i) => (
                  <li
                    key={i}
                    className="flex gap-3 border-b border-[#E5E7EB] pb-3 text-lg font-medium leading-8 text-slate-900 last:border-b-0"
                  >
                    <span
                      aria-hidden
                      className="mt-3 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#6B5BFF]"
                    />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </section>

        {/* ================================================================
            7. EXECUTION LAYER
        ================================================================ */}
        <section className="border-t border-[#E5E7EB] pt-24">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6B5BFF]">
              What reviewers get
            </p>
            <h2 className="mt-4 max-w-3xl text-3xl font-normal leading-[1.15] tracking-tight text-[#0B0B1A] sm:text-5xl">
              Drafted answers.{" "}
              <span className="text-slate-600">Reviewed by you.</span>
            </h2>
          </Reveal>

          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {EXECUTION_BULLETS.map((b, i) => (
              <Reveal key={i} delay={i * 70}>
                <li className="kx-sub-sm flex items-start gap-4 rounded-lg border border-[#E5E7EB] border-l-[3px] border-l-[#0B0B1A] bg-white p-5 shadow-[0_1px_2px_rgba(11,11,26,0.04)] transition hover:shadow-[0_4px_12px_-4px_rgba(11,11,26,0.08)]">
                  <span
                    aria-hidden
                    className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#0B0B1A] text-[11px] font-semibold text-white"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{b}</span>
                </li>
              </Reveal>
            ))}
          </ul>
        </section>

        {/* ================================================================
            8. KNOWLEDGE BASE / MOAT
        ================================================================ */}
        <section className="relative overflow-hidden rounded-2xl bg-[radial-gradient(ellipse_at_top_left,#1B1F4A_0%,#0D1033_40%,#0A0B1F_75%,#070815_100%)] p-8 text-white sm:p-14">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-[22rem] w-[22rem] rounded-full bg-indigo-500/15 blur-[100px]"
          />
          <Reveal>
            <div className="relative max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">
                Private by design
              </p>
              <h2 className="mt-4 text-3xl font-normal leading-[1.1] tracking-tight sm:text-5xl">
                Your evidence.{" "}
                <span className="bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
                  Your workspace.
                </span>
              </h2>
              <p className="mt-6 text-base leading-7 text-slate-100 sm:text-lg">
                Vendor documents stay in your tenant — never shared across
                customers, never used to train anyone else&apos;s model. We
                route through zero-retention LLM providers by default.
              </p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <ul className="relative mt-10 grid gap-3 sm:grid-cols-2">
              {MOAT_BULLETS.map((b, i) => (
                <li
                  key={i}
                  className="flex gap-3 rounded-md border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-slate-100"
                >
                  <span
                    aria-hidden
                    className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-300"
                  />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </section>

        {/* ================================================================
            9. FINAL CLOSE
        ================================================================ */}
        <section className="border-t border-[#E5E7EB] pt-24">
          <Reveal>
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6B5BFF]">
                Before the next audit cycle
              </p>
              <h2 className="mt-4 text-3xl font-normal leading-[1.15] tracking-tight text-[#0B0B1A] sm:text-5xl">
                Compliance with evidence.{" "}
                <span className="text-slate-600">Not guesswork.</span>
              </h2>
              <p className="kx-sub mt-6">
                Stop copy-pasting out of vendor SOC 2 reports. Let your team
                review rationale instead of transcribing control language.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/contact" className={BTN_PRIMARY}>
                  Start a compliance engagement
                </Link>
                <Link href="/sample-report" className={BTN_SECONDARY}>
                  See a sample report
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      {/* ====================================================================
          FOOTER
      ==================================================================== */}
      <footer className="border-t border-[#E5E7EB] bg-[#FAFAFA]">
        <div className="mx-auto max-w-6xl px-6 py-12 text-sm text-slate-600">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Logo wordClassName="text-sm text-[#0B0B1A]" markClassName="h-5 w-5" />
            <p>© {new Date().getFullYear()} KaptrixComply</p>
            <div className="flex items-center gap-6">
              <Link href="/how-it-works" className="transition hover:text-[#0B0B1A]">
                How it works
              </Link>
              <Link href="/framework" className="transition hover:text-[#0B0B1A]">
                Frameworks
              </Link>
              <Link href="/contact" className="transition hover:text-[#0B0B1A]">
                Contact
              </Link>
            </div>
          </div>
          <p className="mt-8 max-w-3xl text-xs leading-5 text-slate-500">
            KaptrixComply is a vendor-compliance review platform. Outputs are
            drafted by AI and reviewed by your compliance officer. Not legal
            or audit advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
