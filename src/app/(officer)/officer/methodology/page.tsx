import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Scale, Target, BookOpen, ChevronRight } from 'lucide-react';
import { PageHeader, Badge } from '@/design-system';
import { getAllFrameworks, DIMENSION_LABELS } from '@/lib/scoring/frameworks';
import type { DimensionId } from '@/lib/scoring/frameworks';

export const metadata = {
  title: 'Framework Methodology — KaptrixComply',
};

export default async function MethodologyPage() {
  const frameworks = getAllFrameworks();

  return (
    <div className="max-w-screen-xl mx-auto space-y-6">
      <PageHeader
        title="Framework Methodology"
        subtitle="How Kaptrix evaluates each compliance framework — dimensions, weights, thresholds, and decision rules. Read-only reference."
        breadcrumbs={[
          { label: 'Dashboard', href: '/officer/dashboard' },
          { label: 'Framework Methodology' },
        ]}
      />

      {/* Overview */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={16} className="text-primary-600" />
          <h2 className="text-sm font-semibold text-gray-900">How scoring works</h2>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">
          Every framework scores a vendor across five dimensions. Each dimension is rated 0-100 from the strength of evidence
          tied to its questions, then combined into a composite score using framework-specific weights. The composite score
          plus average confidence determine the recommended decision (Approved, Conditional, or High Risk).
        </p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: Target, label: 'Dimensions',  text: 'Five categories spanning security, financial, privacy, operations, and governance.' },
            { icon: Scale,  label: 'Weights',     text: 'Each framework weights dimensions based on what matters most for its risk lens.' },
            { icon: ShieldCheck, label: 'Decision', text: 'Score + confidence cross thresholds → Approved, Conditional, or High Risk.' },
          ].map(item => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={13} className="text-primary-600" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-700">{item.label}</span>
                </div>
                <p className="text-xs text-gray-600 leading-snug">{item.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Dimensions reference */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Scoring dimensions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {(Object.entries(DIMENSION_LABELS) as [DimensionId, string][]).map(([id, label]) => (
            <div key={id} className="rounded-lg border border-gray-100 px-3 py-2.5">
              <p className="text-sm font-semibold text-gray-900">{label}</p>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mt-0.5">{id}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Per-framework breakdown */}
      <div className="space-y-5">
        {frameworks.map(fw => (
          <section key={fw.id} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="framework" framework={fw.id} />
                  <h3 className="text-base font-semibold text-gray-900">{fw.label}</h3>
                </div>
                <p className="text-sm text-gray-600 max-w-2xl leading-relaxed">{fw.description}</p>
              </div>
              <Link
                href={`/officer/vendors/new?framework=${fw.id}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:text-primary-800"
              >
                Start engagement with this framework
                <ChevronRight size={12} />
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Weights */}
              <div className="rounded-lg border border-gray-100 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">Dimension weights</p>
                <ul className="space-y-2">
                  {fw.weights.map(w => {
                    const pct = Math.round(w.weight * 100);
                    return (
                      <li key={w.dimension}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-gray-700">{DIMENSION_LABELS[w.dimension]}</span>
                          <span className="tabular-nums text-gray-500">{pct}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Decision thresholds */}
              <div className="rounded-lg border border-gray-100 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">Decision thresholds</p>
                <dl className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <dt className="text-gray-600">Approved (min score)</dt>
                    <dd className="font-semibold text-success-700 tabular-nums">≥ {fw.decision_thresholds.approved_min_score}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-gray-600">Approved (min confidence)</dt>
                    <dd className="font-semibold text-success-700 tabular-nums">≥ {Math.round(fw.decision_thresholds.approved_min_confidence * 100)}%</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-gray-600">High risk (max score)</dt>
                    <dd className="font-semibold text-danger-700 tabular-nums">≤ {fw.decision_thresholds.high_risk_max_score}</dd>
                  </div>
                  <div className="pt-2 mt-2 border-t border-gray-100">
                    <p className="text-[11px] text-gray-500 leading-snug">
                      Scores between the high-risk and approved bands fall into <strong className="text-warning-700">Conditional</strong> —
                      decision requires reviewer judgement on outstanding gaps.
                    </p>
                  </div>
                </dl>
              </div>
            </div>

            {/* KPI labels */}
            {Object.keys(fw.kpi_labels).length > 0 && (
              <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3 border border-gray-100">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">KPI labels used in dashboards</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  {Object.entries(fw.kpi_labels).map(([k, v]) => (
                    <span key={k}>
                      <span className="text-gray-500">{k}:</span>{' '}
                      <span className="text-gray-800 font-medium">{v}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
