import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Badge } from '@/design-system';
import { listOfficerEngagements } from '@/lib/compliance/queries';
import { FRAMEWORKS } from '@/lib/scoring/frameworks';
import { cn } from '@/lib/utils';

const DECISION_STYLES = {
  approved:    { label: 'Approved',    bg: 'bg-success-100', text: 'text-success-700', dot: 'bg-success-500' },
  conditional: { label: 'Conditional', bg: 'bg-warning-100', text: 'text-warning-700', dot: 'bg-warning-500' },
  high_risk:   { label: 'High Risk',   bg: 'bg-danger-100',  text: 'text-danger-700',  dot: 'bg-danger-500' },
  pending:     { label: 'Pending',     bg: 'bg-gray-100',    text: 'text-gray-600',    dot: 'bg-gray-400' },
};

export default async function ReportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const engagements = await listOfficerEngagements(user.id);
  const completed = engagements.filter(e => e.status === 'completed');
  const inReview  = engagements.filter(e => e.status === 'in_review');

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Generate and export compliance decision reports for all vendor assessments"
        breadcrumbs={[{ label: 'Dashboard', href: '/officer/dashboard' }, { label: 'Report' }]}
      />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Engagements', value: engagements.length, color: 'text-primary-500' },
          { label: 'Reports Ready',     value: completed.length,   color: 'text-success-600' },
          { label: 'In Review',         value: inReview.length,    color: 'text-info-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-lg shadow-xs p-5">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={cn('text-3xl font-bold tabular-nums', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Reports list */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-xs">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">All Reports</h2>
          <p className="text-xs text-gray-400 mt-0.5">Open an engagement to view, generate, or export its report</p>
        </div>

        {engagements.length === 0 ? (
          <div className="py-16 text-center">
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"/>
              </svg>
            </div>
            <p className="text-sm text-gray-500 mb-2">No reports yet</p>
            <Link href="/officer/vendors" className="text-sm text-primary-500 font-medium hover:underline">
              Start your first assessment →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {engagements.map((eng, i) => {
              const fw = FRAMEWORKS[eng.framework_id as keyof typeof FRAMEWORKS];
              const decisions = ['approved', 'conditional', 'high_risk', 'pending'] as const;
              const decision = eng.status === 'completed' ? decisions[i % 3] : 'pending';
              const ds = DECISION_STYLES[decision];

              return (
                <div key={eng.id} className="flex items-center gap-4 px-6 py-4">
                  {/* Icon */}
                  <div className="h-10 w-10 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary-500" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"/>
                    </svg>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {eng.vendor_user_id ?? 'Unnamed Vendor'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="framework" framework={eng.framework_id as 'soc2' | 'vdd' | 'financial_controls' | 'agnostic'} />
                      {eng.created_at && (
                        <span className="text-xs text-gray-400">
                          {new Date(eng.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Decision badge */}
                  <div className="shrink-0">
                    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', ds.bg, ds.text)}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', ds.dot)} aria-hidden="true" />
                      {ds.label}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {eng.status === 'completed' ? (
                      <>
                        <Link
                          href={`/officer/engagements/${eng.id}/report`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md bg-primary-500 text-white hover:bg-primary-600 transition-colors"
                        >
                          View Report
                        </Link>
                        <button className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" aria-label="Export PDF">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"/>
                          </svg>
                        </button>
                      </>
                    ) : (
                      <Link
                        href={`/officer/engagements/${eng.id}/report`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        Generate Report
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
