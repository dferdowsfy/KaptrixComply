import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { listOfficerEngagements, getOfficerDashboardAggregates } from '@/lib/compliance/queries';
import { Badge } from '@/design-system';
import { cn } from '@/lib/utils';
import { OfficerUploadEvidenceClient } from '@/components/compliance/OfficerUploadEvidenceClient';
import { DashboardFrameworkPicker } from '@/components/officer/DashboardFrameworkPicker';

// ── Framework definitions — each with a distinct color identity ───────────────
const FRAMEWORKS = [
  {
    id: 'soc2',
    label: 'SOC 2',
    description: 'Trust Services Criteria',
    popular: true,
    // Violet – brand-adjacent, "Most Popular"
    iconBg: '#EDE9FE',
    iconStroke: '#6D28D9',
    badgeBg: '#EDE9FE',
    badgeText: '#4C1D95',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"/>
      </svg>
    ),
  },
  {
    id: 'vdd',
    label: 'Vendor Due Diligence',
    description: 'Vendor Risk Questionnaire',
    popular: false,
    // Emerald green
    iconBg: '#D1FAE5',
    iconStroke: '#059669',
    badgeBg: '#D1FAE5',
    badgeText: '#065F46',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"/>
      </svg>
    ),
  },
  {
    id: 'sox',
    label: 'SOX / ICFR',
    description: 'Internal Controls Over Financial Reporting',
    popular: false,
    // Amber / gold
    iconBg: '#FEF3C7',
    iconStroke: '#D97706',
    badgeBg: '#FEF3C7',
    badgeText: '#92400E',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z"/>
      </svg>
    ),
  },
  {
    id: 'iso27001',
    label: 'ISO 27001',
    description: 'Information Security Management',
    popular: false,
    // Sky blue
    iconBg: '#DBEAFE',
    iconStroke: '#2563EB',
    badgeBg: '#DBEAFE',
    badgeText: '#1E40AF',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"/>
      </svg>
    ),
  },
  {
    id: 'financial_controls',
    label: 'Financial Controls Assessment',
    description: 'Finance & Accounting Controls',
    popular: false,
    // Rose / coral
    iconBg: '#FFE4E6',
    iconStroke: '#E11D48',
    badgeBg: '#FFE4E6',
    badgeText: '#9F1239',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"/>
      </svg>
    ),
  },
];

// ── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  unit,
  descriptor,
  descriptorColor,
  valueColor,
}: {
  label: string;
  value: string | number;
  unit?: string;
  descriptor?: string;
  descriptorColor?: string;
  valueColor: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-xs flex flex-col gap-2">
      <p className="text-sm text-gray-500">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-4xl font-bold text-gray-900 tabular-nums leading-none" style={{ color: valueColor }}>
          {value}
        </span>
        {unit && <span className="text-base text-gray-400 font-medium">{unit}</span>}
      </div>
      {descriptor && (
        <p className="text-xs font-medium" style={{ color: descriptorColor ?? valueColor }}>
          {descriptor}
        </p>
      )}
    </div>
  );
}

// ── Coverage bar row ──────────────────────────────────────────────────────────
function CoverageRow({
  label,
  pct,
  answered,
  total,
  color,
  iconBg,
}: {
  label: string;
  pct: number;
  answered: number;
  total: number;
  color: string;
  iconBg: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn('h-8 w-8 rounded-full flex items-center justify-center shrink-0', iconBg)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"/>
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-700">{label}</span>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-semibold text-gray-900">{pct}%</span>
            <span className="text-xs text-gray-400">{answered} / {total}</span>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default async function OfficerDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [engagements, aggregates] = await Promise.all([
    listOfficerEngagements(user.id),
    getOfficerDashboardAggregates(user.id),
  ]);

  const {
    totalDocuments,
    totalQuestions,
    totalAnswered,
    highRiskGapCount,
    averageRiskScore,
    coverageByDomain,
    topGaps,
    progressByEngagement,
  } = aggregates;

  const answeredPct = totalQuestions > 0 ? Math.round((totalAnswered / totalQuestions) * 100) : 0;
  const riskBand =
    averageRiskScore == null
      ? null
      : averageRiskScore >= 80
        ? { label: 'Low Risk', color: '#059669' }
        : averageRiskScore >= 60
          ? { label: 'Medium Risk', color: '#D97706' }
          : { label: 'High Risk', color: '#DC2626' };
  const riskValueColor = riskBand?.color ?? '#9CA3AF';
  const domainPaletteByIndex = ['#10B981', '#8B5CF6', '#0EA5E9', '#F59E0B', '#EC4899', '#14B8A6'];
  const domainIconBgByIndex = ['bg-success-50', 'bg-primary-50', 'bg-sky-50', 'bg-amber-50', 'bg-pink-50', 'bg-teal-50'];

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* ── Hero card ── */}
      <div
        className="rounded-xl border border-primary-100 p-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)' }}
      >
        {/* Decorative shield */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none select-none" aria-hidden="true">
          <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor" className="text-primary-400">
            <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"/>
          </svg>
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-primary-600 mb-2">
          WELCOME BACK
        </p>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Compliance Diligence</h1>
        <p className="text-sm text-gray-600 mb-6 max-w-md">
          Evaluate vendors and companies with evidence-backed answers, risk scoring, and actionable remediation.
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="/officer/vendors"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-white text-sm font-semibold rounded-md hover:bg-primary-600 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
            </svg>
            Start New Assessment
          </Link>
          <Link
            href="/officer/vendors"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 text-sm font-semibold rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            View Assessments
          </Link>
        </div>
      </div>

      {/* ── Upload evidence (primary action) ── */}
      <OfficerUploadEvidenceClient
        engagements={engagements}
        size="lg"
        hint={
          engagements.length === 0
            ? 'Create a vendor engagement first — evidence is linked to an engagement.'
            : 'Drop a PDF, Word or spreadsheet. AI reads it and auto-fills matching questionnaire answers.'
        }
      />

      {/* ── Framework selector ── */}
      <DashboardFrameworkPicker frameworks={FRAMEWORKS} />

      {/* ── Your assessments ── */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-xs">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Your assessments</h2>
          <Link href="/officer/vendors" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            View all →
          </Link>
        </div>
        {engagements.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-500 mb-3">No vendor assessments yet.</p>
            <Link href="/officer/vendors" className="text-sm text-primary-600 hover:underline font-medium">
              Start your first assessment →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {engagements.slice(0, 5).map(eng => {
              const progress = progressByEngagement[eng.id] ?? 0;
              const vendorName = eng.vendor_company ?? eng.vendor_email ?? 'Unnamed Vendor';
              return (
              <Link
                key={eng.id}
                href={`/officer/engagements/${eng.id}/questionnaire`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group"
              >
                {/* Framework icon */}
                <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary-600" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {vendorName}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    <Badge variant="framework" framework={eng.framework_id as 'soc2' | 'vdd' | 'financial_controls' | 'agnostic'} />
                    <span className="ml-2">
                      {eng.created_at
                        ? `Started ${new Date(eng.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                        : ''}
                    </span>
                  </p>
                </div>
                <Badge variant="status" status={
                  eng.status === 'in_review' ? 'info' :
                  eng.status === 'completed' ? 'success' :
                  eng.status === 'archived' ? 'neutral' : 'warning'
                }>
                  {eng.status === 'in_review' ? 'In Progress' :
                   eng.status === 'completed' ? 'Completed' :
                   eng.status === 'draft' ? 'Draft' : eng.status}
                </Badge>
                <div className="flex items-center gap-2 shrink-0 min-w-[120px]">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Overall Progress</span>
                      <span className="font-semibold text-primary-600">{progress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden w-24">
                      <div className="h-full rounded-full bg-primary-500" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 group-hover:text-gray-600 shrink-0" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
                </svg>
              </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ── At a glance KPI strip ── */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">At a glance</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            label="Overall Risk Score"
            value={averageRiskScore == null ? '—' : Math.round(averageRiskScore)}
            unit={averageRiskScore == null ? undefined : '/ 100'}
            descriptor={riskBand?.label ?? 'No reports yet'}
            descriptorColor={riskBand?.color ?? '#9CA3AF'}
            valueColor={riskValueColor}
          />
          <KpiCard
            label="Questions Answered"
            value={totalAnswered}
            unit={totalQuestions > 0 ? `/ ${totalQuestions}` : undefined}
            descriptor={totalQuestions > 0 ? `${answeredPct}%` : 'No questionnaires yet'}
            descriptorColor="#7C3AED"
            valueColor="#8B5CF6"
          />
          <KpiCard
            label="High Risk Gaps"
            value={highRiskGapCount}
            descriptor={highRiskGapCount > 0 ? 'Require attention' : 'None open'}
            descriptorColor={highRiskGapCount > 0 ? '#DC2626' : '#059669'}
            valueColor={highRiskGapCount > 0 ? '#EF4444' : '#10B981'}
          />
          <KpiCard
            label="Evidence Items"
            value={totalDocuments}
            descriptor={totalDocuments > 0 ? 'Uploaded' : 'None uploaded'}
            descriptorColor="#2563EB"
            valueColor="#3B82F6"
          />
        </div>
      </div>

      {/* ── Compliance gaps ── */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-xs">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Compliance gaps</h2>
          <Link href="/officer/gaps" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            View all gaps →
          </Link>
        </div>
        <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
          {/* Left: coverage by domain */}
          <div className="p-6 space-y-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Coverage by domain</p>
            {coverageByDomain.length === 0 ? (
              <p className="text-sm text-gray-500">
                No coverage data yet. Start an assessment to see domain breakdowns.
              </p>
            ) : (
              <>
                {coverageByDomain.slice(0, 6).map((row, idx) => (
                  <CoverageRow
                    key={row.category}
                    label={row.category}
                    pct={row.pct}
                    answered={row.answered}
                    total={row.total}
                    color={domainPaletteByIndex[idx % domainPaletteByIndex.length]}
                    iconBg={domainIconBgByIndex[idx % domainIconBgByIndex.length]}
                  />
                ))}
                <Link href="/officer/gaps" className="mt-2 inline-flex items-center justify-center w-full px-4 py-2 border border-gray-200 text-sm text-gray-600 rounded-md hover:bg-gray-50 transition-colors">
                  View all domains
                </Link>
              </>
            )}
          </div>

          {/* Right: top gaps */}
          <div className="p-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Top gaps</p>
            {topGaps.length === 0 ? (
              <p className="text-sm text-gray-500">No open compliance gaps yet.</p>
            ) : (
              <>
                <div className="space-y-1">
                  {topGaps.map(gap => (
                    <Link
                      key={gap.title}
                      href="/officer/gaps"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-50 transition-colors group"
                    >
                      <div className="h-7 w-7 rounded-full bg-danger-50 flex items-center justify-center shrink-0">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-danger-600" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"/>
                        </svg>
                      </div>
                      <span className="flex-1 text-sm text-gray-700 group-hover:text-gray-900 leading-snug">{gap.title}</span>
                      <div className="text-right shrink-0">
                        <p className="text-base font-bold text-danger-500 leading-none">{gap.count}</p>
                        <p className="text-[10px] text-gray-400 leading-tight">{gap.count === 1 ? 'engagement' : 'engagements'}</p>
                      </div>
                    </Link>
                  ))}
                </div>
                <Link href="/officer/gaps" className="mt-3 inline-flex items-center justify-center w-full px-4 py-2 border border-gray-200 text-sm text-gray-600 rounded-md hover:bg-gray-50 transition-colors">
                  View all gaps
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Ask AI CTA strip ── */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-xs px-6 py-5 flex items-center gap-4">
        <div className="h-10 w-10 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="text-primary-600" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 3v4M21 5h-4"/>
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">Not sure where to start?</p>
          <p className="text-xs text-gray-500">Let our AI assistant guide you through your compliance assessment.</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white text-sm font-semibold rounded-md hover:bg-primary-600 transition-colors shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 3v4M21 5h-4"/>
          </svg>
          Ask AI Assistant
        </button>
      </div>

    </div>
  );
}
