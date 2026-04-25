"use client";

import { useEffect, useState } from "react";

type StepId = "intake" | "scoring" | "export";

type Step = {
  id: StepId;
  kicker: string;
  title: string;
  description: string;
};

const STEPS: Step[] = [
  {
    id: "intake",
    kicker: "Layer 01",
    title: "Evidence intake",
    description: "Parse SOC 2 reports, policies, and DPAs into a searchable evidence pack.",
  },
  {
    id: "scoring",
    kicker: "Layer 02",
    title: "Controls scoring",
    description: "Auto-fill each control with a draft answer, cited passage, and confidence score.",
  },
  {
    id: "export",
    kicker: "Layer 03",
    title: "Audit-ready export",
    description: "One-click PDF: cover, KPI coverage, per-control rationale, evidence trail.",
  },
];

// ─── Mock 1: Evidence intake ────────────────────────────────────────────────
function IntakeMock() {
  const docs = [
    { name: "Acme_SOC2_Type_II_2025.pdf", size: "3.2 MB · 62 pages", status: "Indexed", chunks: 184 },
    { name: "Acme_Information_Security_Policy.docx", size: "412 KB · 18 pages", status: "Indexed", chunks: 96 },
    { name: "Acme_DPA_v3.pdf", size: "1.8 MB · 24 pages", status: "Indexed", chunks: 71 },
    { name: "Acme_ISO27001_Certificate.pdf", size: "320 KB · 2 pages", status: "Indexed", chunks: 8 },
    { name: "Acme_Pen_Test_Summary_2025.pdf", size: "740 KB · 8 pages", status: "Parsing…", chunks: null as number | null },
  ];
  return (
    <div className="h-full w-full bg-white p-5 text-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-600">Engagement · Acme Corp · SOC 2</p>
          <h3 className="mt-1 text-base font-semibold">Evidence pack</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
            4 indexed · 359 chunks
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Upload
          </span>
        </div>
      </div>

      <div className="rounded-md border border-slate-200">
        <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          <span>Document</span>
          <span>Chunks</span>
          <span>Status</span>
        </div>
        {docs.map((d) => (
          <div key={d.name} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-slate-100 px-4 py-2.5 text-xs last:border-b-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" aria-hidden className="shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path strokeLinecap="round" strokeLinejoin="round" d="M14 2v6h6M9 13h6M9 17h6" /></svg>
              <div className="min-w-0">
                <div className="truncate font-medium text-slate-800">{d.name}</div>
                <div className="text-[10px] text-slate-500">{d.size}</div>
              </div>
            </div>
            <div className="tabular-nums text-slate-600">{d.chunks ?? "—"}</div>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              d.status === "Indexed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${d.status === "Indexed" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
              {d.status}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] text-slate-500">
        Documents are chunked, embedded, and retrieved per control during extraction — nothing leaves your workspace.
      </p>
    </div>
  );
}

// ─── Mock 2: Controls scoring ──────────────────────────────────────────────
function ScoringMock() {
  return (
    <div className="h-full w-full bg-white p-5 text-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-600">Engagement · Acme Corp · SOC 2</p>
          <h3 className="mt-1 text-base font-semibold">Questionnaire review</h3>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">24 auto-filled</span>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">6 partial</span>
          <span className="rounded-full bg-rose-50 px-2.5 py-1 font-semibold text-rose-700">4 missing</span>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">CC6.1 · Logical & Physical Access</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              Does the vendor enforce multi-factor authentication for all administrative access to production systems?
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
            Auto-filled
          </span>
        </div>

        <div className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Answer</div>
        <p className="mt-1 text-[13px] leading-relaxed text-slate-800">
          Yes. All administrative access to production systems requires MFA enforced via Okta SSO with either a hardware security key (YubiKey) or TOTP authenticator. No password-only admin access is permitted.
        </p>

        <div className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Rationale</div>
        <div className="mt-1 rounded border-l-[3px] border-sky-500 bg-slate-50 px-3 py-2 text-[12px] leading-relaxed text-slate-700">
          Acme&apos;s Information Security Policy §4.2 mandates MFA for all privileged accounts. This is corroborated by the SOC 2 Type II report (Control CC6.1, testing period Jan–Dec 2025) where the auditor noted <em>no exceptions</em>. The DPA further restricts admin access to named individuals.
        </div>

        <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-600">
          <span className="font-semibold">Confidence:</span>
          <span>92% (High)</span>
          <div className="h-1 w-16 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full bg-emerald-500" style={{ width: "92%" }} />
          </div>
        </div>

        <div className="mt-3 border-t border-dashed border-slate-200 pt-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Cited evidence · 3 passages</div>
          <blockquote className="mt-2 rounded border-l-2 border-slate-400 bg-slate-50 px-3 py-2 text-[11px] italic text-slate-700">
            “Multi-factor authentication shall be enforced for all privileged accounts accessing production infrastructure…”
            <div className="mt-1 not-italic text-[10px] font-medium text-slate-500">Acme_Information_Security_Policy.docx · §4.2 · page 9</div>
          </blockquote>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-slate-500">
        Reviewers accept, edit, or reject each draft before it&apos;s final — the AI never commits on your behalf.
      </p>
    </div>
  );
}

// ─── Mock 3: Audit-ready export ────────────────────────────────────────────
function ExportMock() {
  return (
    <div className="h-full w-full bg-slate-100 p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-600">Export · PDF preview</p>
          <h3 className="mt-1 text-base font-semibold text-slate-900">Compliance Assessment Report</h3>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
          Download PDF
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Page 1 — cover */}
        <div className="relative rounded-md border border-slate-300 bg-white shadow-sm">
          <div className="border-b-4 border-sky-500 px-5 pb-4 pt-5">
            <div className="text-[8px] font-bold uppercase tracking-[0.18em] text-sky-700">Compliance Assessment Report</div>
            <div className="mt-2 text-lg font-bold leading-tight text-slate-900">Acme Corp</div>
            <div className="mt-0.5 text-[9px] text-slate-600">SOC 2 Type II · Vendor Questionnaire</div>
          </div>
          <div className="grid grid-cols-2 gap-3 px-5 py-4 text-[9px]">
            <div><div className="font-bold uppercase tracking-wider text-slate-500">Framework</div><div className="font-semibold text-slate-900">SOC 2</div></div>
            <div><div className="font-bold uppercase tracking-wider text-slate-500">Coverage</div><div className="font-semibold text-slate-900">87% answered</div></div>
            <div><div className="font-bold uppercase tracking-wider text-slate-500">Generated</div><div className="font-semibold text-slate-900">Apr 24, 2026</div></div>
            <div><div className="font-bold uppercase tracking-wider text-slate-500">Status</div><div className="font-semibold text-slate-900">Review complete</div></div>
          </div>
          <div className="px-5 pb-5">
            <div className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Executive summary</div>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {[{n:34,l:"Total"},{n:24,l:"Auto",c:"text-emerald-700"},{n:6,l:"Partial",c:"text-amber-700"},{n:4,l:"Missing",c:"text-rose-700"}].map(k => (
                <div key={k.l} className="rounded border border-slate-200 p-1.5">
                  <div className={`text-sm font-bold leading-none ${k.c ?? "text-slate-900"}`}>{k.n}</div>
                  <div className="mt-1 text-[7px] font-semibold uppercase tracking-wider text-slate-500">{k.l}</div>
                </div>
              ))}
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-sky-500" style={{ width: "87%" }} />
            </div>
          </div>
          <span className="absolute bottom-1.5 right-2 text-[8px] font-semibold text-slate-400">Page 1</span>
        </div>

        {/* Page 2 — rationale */}
        <div className="relative rounded-md border border-slate-300 bg-white shadow-sm">
          <div className="px-5 pt-5">
            <div className="text-[10px] font-bold text-slate-900">AI Rationale &amp; Findings</div>
            <div className="mt-0.5 text-[8px] text-slate-500">Determined reasoning for each answered control.</div>
          </div>
          <div className="space-y-2 px-5 py-3 text-[8px]">
            {[
              { id: "CC6.1", q: "MFA for administrative access", status: "Auto", conf: "92%" },
              { id: "CC6.7", q: "Data-at-rest encryption on production storage", status: "Auto", conf: "88%" },
              { id: "CC7.2", q: "Monitoring of security events across infrastructure", status: "Partial", conf: "64%" },
            ].map((r, i) => (
              <div key={i} className="border-b border-slate-100 pb-2 last:border-b-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold uppercase tracking-wider text-slate-500">{r.id}</div>
                    <div className="font-semibold leading-tight text-slate-900">{r.q}</div>
                  </div>
                  <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[7px] font-bold uppercase ${
                    r.status === "Auto" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"
                  }`}>{r.status}</span>
                </div>
                <div className="mt-1 rounded border-l-2 border-sky-500 bg-slate-50 px-2 py-1 leading-snug text-slate-700">
                  {i === 0 && "Policy §4.2 + SOC 2 CC6.1 testing (no exceptions); DPA restricts admin to named users."}
                  {i === 1 && "SOC 2 CC6.7 confirms AES-256 at rest across RDS + S3. Pen-test Q3 2025 identified no gaps."}
                  {i === 2 && "SIEM in place (Datadog), but alert runbook coverage only spans 3 of 5 critical services — reviewer flag."}
                </div>
                <div className="mt-1 text-[7px] text-slate-500">Confidence: {r.conf}</div>
              </div>
            ))}
          </div>
          <span className="absolute bottom-1.5 right-2 text-[8px] font-semibold text-slate-400">Page 2</span>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-slate-500">
        Cover page, KPI coverage, per-control rationale, and evidence trail — all in one shareable PDF.
      </p>
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────
export function ComplyShowcase() {
  const [active, setActive] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const current = STEPS[active];

  useEffect(() => {
    if (!autoplay) return;
    const id = window.setTimeout(
      () => setActive((prev) => (prev + 1) % STEPS.length),
      6500,
    );
    return () => window.clearTimeout(id);
  }, [active, autoplay]);

  const gotoPrev = () => {
    setActive((prev) => (prev - 1 + STEPS.length) % STEPS.length);
    setAutoplay(false);
  };
  const gotoNext = () => {
    setActive((prev) => (prev + 1) % STEPS.length);
    setAutoplay(false);
  };

  return (
    <div className="mt-14">
      <div className="relative overflow-hidden rounded-[2rem] border border-slate-800/20 bg-slate-950 p-4 shadow-2xl sm:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-20 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl"
        />

        <ol className="relative mb-5 grid gap-2 sm:grid-cols-3">
          {STEPS.map((step, idx) => {
            const isActive = idx === active;
            return (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => {
                    setActive(idx);
                    setAutoplay(false);
                  }}
                  aria-current={isActive ? "step" : undefined}
                  className={`group relative flex h-full w-full flex-col overflow-hidden rounded-2xl border p-4 text-left transition ${
                    isActive
                      ? "border-white/30 bg-white/10 text-white shadow-lg"
                      : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:bg-white/[0.06]"
                  }`}
                >
                  <div
                    aria-hidden
                    className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-sky-400 via-indigo-400 to-transparent ${
                      isActive ? "opacity-100" : "opacity-40"
                    }`}
                  />
                  <p
                    className={`text-[10px] font-semibold uppercase tracking-[0.28em] sm:text-[11px] sm:tracking-[0.3em] ${
                      isActive ? "text-indigo-200" : "text-slate-400"
                    }`}
                  >
                    {step.kicker}
                  </p>
                  <p className={`mt-1 text-sm font-semibold sm:text-base ${isActive ? "text-white" : "text-slate-200"}`}>
                    {step.title}
                  </p>
                  <p className={`mt-1 text-xs leading-5 sm:text-[13px] sm:leading-5 ${isActive ? "text-slate-200" : "text-slate-400"}`}>
                    {step.description}
                  </p>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="relative mx-auto aspect-[16/10] w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
          {current.id === "intake" && <IntakeMock />}
          {current.id === "scoring" && <ScoringMock />}
          {current.id === "export" && <ExportMock />}
        </div>

        <div className="relative mt-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {STEPS.map((_, idx) => (
              <span
                key={idx}
                aria-hidden
                className={`h-1.5 rounded-full transition-all ${
                  idx === active ? "w-10 bg-indigo-400" : "w-4 bg-white/20"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={gotoPrev}
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
            >
              ← Previous
            </button>
            <button
              type="button"
              onClick={gotoNext}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
