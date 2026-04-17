"use client";

import {
  demoDocuments,
  demoExecutiveReport,
  demoKnowledgeInsights,
} from "@/lib/demo-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import { SectionHeader } from "@/components/preview/preview-shell";
import { useSelectedPreviewClient } from "@/hooks/use-selected-preview-client";

export default function PreviewOverviewPage() {
  const { client } = useSelectedPreviewClient();

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Overview"
        title="Engagement snapshot"
        description="A concise view of current diligence posture before you drill into intake, coverage, insights, and reporting tabs."
      />

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-8 text-white shadow-[0_30px_80px_-30px_rgba(79,70,229,0.55)]">
        <div
          className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-indigo-500/40 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-indigo-200">
              AI product diligence · Phase 1 workspace
            </p>
            <h2 className="mt-2 text-4xl font-bold tracking-tight">
              {client.target}
            </h2>
            <p className="mt-3 text-base text-slate-300">
              {client.client} · {client.deal_stage.replace("_", " ")} · Due{" "}
              {formatDate(client.deadline)}
            </p>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
              {client.summary}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Tile label="Tier" value={client.tier} />
            <Tile label="Fee" value={formatCurrency(client.fee_usd)} />
            <Tile label="Status" value={client.status} />
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Documents indexed"
          value={String(demoDocuments.length)}
          helper="RAG corpus active"
        />
        <MetricCard
          label="Insights surfaced"
          value={String(demoKnowledgeInsights.length)}
          helper="Grounded snippets"
        />
        <MetricCard
          label="Composite score"
          value={
            client.composite_score !== null
              ? client.composite_score.toFixed(1)
              : "—"
          }
          helper="Across six dimensions"
        />
        <MetricCard
          label="Recommendation"
          value={client.recommendation}
          helper="Current investment posture"
          tone="warn"
        />
      </div>

      {client.id !== "preview-engagement-001" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-base leading-7 text-amber-900 shadow-[0_0_0_4px_rgba(251,191,36,0.12)]">
          You&apos;re viewing the header and summary for{" "}
          <span className="font-semibold">{client.target}</span>. The intake,
          coverage, insights, analysis, scoring, and report tabs below still
          display the fully populated demo data for{" "}
          <span className="font-semibold">LexiFlow AI</span> until per-client
          mock data is added. Use <em>Switch client</em> in the header to
          return.
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_0_0_1px_rgba(15,23,42,0.04),0_18px_50px_-30px_rgba(15,23,42,0.35)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-600">
          Recommendation context
        </p>
        <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
          {demoExecutiveReport.recommendation} ·{" "}
          {demoExecutiveReport.confidence} conviction
        </h3>
        <p className="mt-3 max-w-4xl text-base leading-7 text-slate-700">
          {demoExecutiveReport.executive_summary}
        </p>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "default" | "warn";
}) {
  return (
    <div
      className={`rounded-3xl border bg-white p-6 transition hover:-translate-y-0.5
        ${
          tone === "warn"
            ? "border-amber-200 shadow-[0_0_0_4px_rgba(251,191,36,0.12),0_18px_50px_-25px_rgba(217,119,6,0.55)]"
            : "border-slate-200 shadow-[0_0_0_1px_rgba(15,23,42,0.04),0_18px_50px_-25px_rgba(79,70,229,0.35)]"
        }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p
        className={`mt-3 text-3xl font-bold capitalize ${
          tone === "warn" ? "text-amber-700" : "text-slate-900"
        }`}
      >
        {value}
      </p>
      <p className="mt-2 text-base text-slate-600">{helper}</p>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/20 backdrop-blur">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-200">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold capitalize text-white">
        {value}
      </p>
    </div>
  );
}
