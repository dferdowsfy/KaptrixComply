import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/design-system';
import { listVendorEngagements } from '@/lib/compliance/queries';
import { FRAMEWORKS } from '@/lib/scoring/frameworks';
import { cn } from '@/lib/utils';

// ── Completeness ring ─────────────────────────────────────────────────────────
function CompletenessRing({ pct }: { pct: number }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const dash = (pct / 100) * circumference;
  return (
    <div className="relative h-28 w-28">
      <svg width="112" height="112" viewBox="0 0 112 112" className="-rotate-90" aria-hidden="true">
        <circle cx="56" cy="56" r={radius} fill="none" stroke="#E5E7EB" strokeWidth="8" />
        <circle
          cx="56" cy="56" r={radius} fill="none"
          stroke="#8B5CF6" strokeWidth="8"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gray-900 leading-none">{pct}%</span>
        <span className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wider">Complete</span>
      </div>
    </div>
  );
}

// ── Questionnaire step card ───────────────────────────────────────────────────
function QuestionnaireCard({
  eng,
  framework,
}: {
  eng: { id: string; framework_id: string; status: string; due_date?: string | null; created_at?: string };
  framework: { label: string } | undefined;
}) {
  const statusLabel = eng.status === 'in_review' ? 'In Progress'
    : eng.status === 'completed' ? 'Completed'
    : 'Draft';
  const statusVariant: 'info' | 'success' | 'neutral' =
    eng.status === 'in_review' ? 'info' : eng.status === 'completed' ? 'success' : 'neutral';

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-xs p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0 mt-0.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary-600" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"/>
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="framework" framework={eng.framework_id as 'soc2' | 'vdd' | 'financial_controls' | 'agnostic'} />
              <Badge variant="status" status={statusVariant}>{statusLabel}</Badge>
            </div>
            <h3 className="text-sm font-semibold text-gray-900">
              {framework?.label ?? eng.framework_id}
            </h3>
            {eng.due_date && (
              <p className="text-xs text-gray-400 mt-0.5">Due: {eng.due_date}</p>
            )}
          </div>
        </div>
        <Link
          href={`/vendor/questionnaires/${eng.id}`}
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-md bg-primary-500 text-white hover:bg-primary-600 transition-colors"
        >
          Continue →
        </Link>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>Questionnaire progress</span>
          <span className="font-semibold text-primary-600">20%</span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full rounded-full bg-primary-500 transition-all" style={{ width: '20%' }} />
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default async function VendorDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const engagements = await listVendorEngagements(user.id);
  const activeEngagements = engagements.filter(e => e.status === 'in_review');
  const completedEngagements = engagements.filter(e => e.status === 'completed');

  const completeness = engagements.length > 0 ? 40 : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* ── Profile completeness card ── */}
      <div
        className="rounded-xl border border-primary-100 p-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)' }}
      >
        <div className="flex items-center gap-6">
          <CompletenessRing pct={completeness} />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-primary-600 mb-1">
              COMPLIANCE PROFILE
            </p>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Your Compliance Status</h1>
            <p className="text-sm text-gray-600 mb-3">
              Complete your questionnaires and upload evidence to improve your compliance score.
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-info-500" aria-hidden="true" />
                {activeEngagements.length} active review{activeEngagements.length !== 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-success-500" aria-hidden="true" />
                {completedEngagements.length} completed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-300" aria-hidden="true" />
                {engagements.length} total
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Active reviews ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">Active Reviews</h2>
          {activeEngagements.length > 0 && (
            <Link href="/vendor/questionnaires" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              View all →
            </Link>
          )}
        </div>

        {activeEngagements.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg shadow-xs p-8 text-center">
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">No active reviews</p>
            <p className="text-xs text-gray-400">A compliance officer will send you a questionnaire when one is started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeEngagements.map(eng => (
              <QuestionnaireCard
                key={eng.id}
                eng={eng}
                framework={FRAMEWORKS[eng.framework_id as keyof typeof FRAMEWORKS]}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg shadow-xs p-5">
          <p className="text-xs text-gray-500 mb-2">Active Reviews</p>
          <p className="text-3xl font-bold text-info-500 tabular-nums">{activeEngagements.length}</p>
          <p className="text-xs text-gray-400 mt-1">In progress</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg shadow-xs p-5">
          <p className="text-xs text-gray-500 mb-2">Questions Answered</p>
          <p className="text-3xl font-bold text-primary-500 tabular-nums">
            {engagements.length > 0 ? Math.round(engagements.length * 12) : 0}
          </p>
          <p className="text-xs text-gray-400 mt-1">Across all reviews</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg shadow-xs p-5">
          <p className="text-xs text-gray-500 mb-2">Evidence Uploaded</p>
          <p className="text-3xl font-bold text-success-600 tabular-nums">
            {engagements.length > 0 ? Math.round(engagements.length * 5) : 0}
          </p>
          <p className="text-xs text-gray-400 mt-1">Documents</p>
        </div>
      </div>

      {/* ── All engagements ── */}
      {engagements.length > activeEngagements.length && (
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">All Engagements</h2>
          <div className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Framework', 'Status', 'Due Date', ''].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {engagements.map(eng => (
                  <tr key={eng.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <Badge variant="framework" framework={eng.framework_id as 'soc2' | 'vdd' | 'financial_controls' | 'agnostic'} />
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant="status" status={eng.status === 'in_review' ? 'info' : eng.status === 'completed' ? 'success' : 'neutral'}>
                        {eng.status === 'in_review' ? 'In Progress' : eng.status === 'completed' ? 'Completed' : 'Draft'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">{eng.due_date ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <Link href={`/vendor/questionnaires/${eng.id}`} className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── AI CTA ── */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-xs px-6 py-5 flex items-center gap-4">
        <div className="h-10 w-10 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="text-primary-600" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 3v4M21 5h-4"/>
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">Not sure what to upload?</p>
          <p className="text-xs text-gray-500">Let our AI guide you through what evidence you need to provide.</p>
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
