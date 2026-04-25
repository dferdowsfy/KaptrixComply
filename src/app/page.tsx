import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/home/public-header";

export const metadata: Metadata = {
  title: "Kaptrix | Evidence-backed intelligence for AI decisions",
  description:
    "Choose your pathway: AI Diligence for evaluating AI companies and products, or Compliance Intelligence for assessing controls and evidence.",
};

const PATHWAYS = [
  {
    id: "aideligence",
    href: "/aideligence",
    title: "AI Diligence",
    description:
      "Evaluate AI companies, products, and capabilities with evidence-backed scoring, risk analysis, and committee-ready reports.",
    bullets: [
      "Validate claims vs. reality",
      "Assess risk across six dimensions",
      "Generate investment-grade reports",
    ],
    cta: "Evaluate an AI Company",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
        <circle cx="11" cy="11" r="6.5" strokeLinecap="round" />
        <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        <path d="M11 8.5v5M8.5 11h5" strokeLinecap="round" />
      </svg>
    ),
    iconBg: "bg-gradient-to-br from-indigo-500/30 to-fuchsia-500/30 ring-1 ring-indigo-300/30",
    iconColor: "text-indigo-200",
  },
  {
    id: "compliance",
    href: "/compliance",
    title: "Compliance Intelligence",
    description:
      "Assess controls, policies, and evidence to ensure AI systems and vendors are controlled, defensible, and audit-ready.",
    bullets: [
      "Map evidence to controls & frameworks",
      "Surface gaps and remediation actions",
      "Produce audit-ready assessments",
    ],
    cta: "Assess Compliance Evidence",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
        <path
          d="M12 3.5 5 6v6c0 4 3 7.5 7 8.5 4-1 7-4.5 7-8.5V6l-7-2.5Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    iconBg: "bg-gradient-to-br from-emerald-500/30 to-teal-500/30 ring-1 ring-emerald-300/30",
    iconColor: "text-emerald-200",
  },
];

const PILLARS = [
  {
    title: "Evidence over claims",
    line: "Every answer is grounded in real artifacts.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
        <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
        <path d="M14 3v5h5" strokeLinejoin="round" />
        <path d="M9 13h7M9 17h5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Structured & repeatable",
    line: "Consistent scoring across frameworks and teams.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
        <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    title: "Confidence with clarity",
    line: "See why we're confident — and what's still missing.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5v5l3 2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Decision-ready outputs",
    line: "Reports your team and board can trust.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
        <path d="M4 19V9M9 19v-7M14 19V5M19 19v-9" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Secure by design",
    line: "Your data stays yours. Always.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
        <rect x="5" y="10" width="14" height="10" rx="1.5" />
        <path d="M8 10V7a4 4 0 1 1 8 0v3" />
      </svg>
    ),
  },
];

export default function ChooserPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#0A0B1F] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(107,91,255,0.25), transparent 70%), radial-gradient(40% 40% at 80% 30%, rgba(56,189,248,0.12), transparent 70%), linear-gradient(180deg, #0B0C24 0%, #06071A 100%)",
        }}
      />

      <PublicHeader />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 pb-20 pt-32 sm:pt-36">
        <section className="max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.32em] text-indigo-300/80">
            The Platform
          </p>
          <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Evidence-backed intelligence
            <br className="hidden sm:block" /> for AI decisions.
          </h1>
          <p className="mt-6 max-w-2xl text-base text-slate-300 sm:text-lg">
            Kaptrix evaluates AI systems and vendors with evidence, structure, and confidence — so you can make decisions that hold up.
          </p>
        </section>

        <section className="mt-12 grid gap-5 sm:mt-14 lg:grid-cols-2 lg:gap-6">
          {PATHWAYS.map((p) => (
            <article
              key={p.id}
              className="relative flex flex-col gap-6 rounded-2xl border border-white/10 bg-white/[0.04] p-7 backdrop-blur-sm transition hover:border-white/20 hover:bg-white/[0.06] sm:p-8"
            >
              <div className="flex items-center gap-4">
                <span
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${p.iconBg} ${p.iconColor}`}
                >
                  <span className="block h-6 w-6">{p.icon}</span>
                </span>
                <h2 className="text-xl font-semibold text-white sm:text-2xl">
                  {p.title}
                </h2>
              </div>

              <p className="text-sm text-slate-300 sm:text-base">{p.description}</p>

              <ul className="flex flex-col gap-2.5 text-sm text-slate-200">
                {p.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2.5">
                    <svg
                      aria-hidden
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mt-[3px] shrink-0 text-emerald-300"
                    >
                      <path d="m5 12 5 5L20 7" />
                    </svg>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={p.href}
                className="mt-2 inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
              >
                {p.cta}
                <span aria-hidden>→</span>
              </Link>
            </article>
          ))}
        </section>

        <section className="mt-16 sm:mt-20">
          <p className="text-center text-[11px] font-medium uppercase tracking-[0.32em] text-slate-400">
            Powered by a unified evidence engine
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {PILLARS.map((pill) => (
              <div key={pill.title} className="flex items-start gap-3">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-slate-200 ring-1 ring-white/10">
                  <span className="block h-4 w-4">{pill.icon}</span>
                </span>
                <div>
                  <p className="text-sm font-medium text-white">{pill.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                    {pill.line}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
