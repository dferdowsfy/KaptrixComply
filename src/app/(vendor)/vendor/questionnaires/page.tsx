import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Badge } from '@/design-system';
import { listVendorEngagements } from '@/lib/compliance/queries';
import { FRAMEWORKS } from '@/lib/scoring/frameworks';
import { cn } from '@/lib/utils';

export default async function VendorQuestionnairesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const engagements = await listVendorEngagements(user.id);
  const active    = engagements.filter(e => e.status === 'in_review');
  const completed = engagements.filter(e => e.status === 'completed');
  const draft     = engagements.filter(e => e.status === 'draft');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Questionnaires"
        subtitle="Active compliance questionnaires sent to you for completion"
        breadcrumbs={[{ label: 'Dashboard', href: '/vendor/dashboard' }, { label: 'Questionnaires' }]}
      />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Active Reviews',   value: active.length,    color: 'text-info-600' },
          { label: 'Completed',        value: completed.length, color: 'text-success-600' },
          { label: 'Draft',            value: draft.length,     color: 'text-gray-500' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-lg shadow-xs p-5">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={cn('text-3xl font-bold tabular-nums', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Active questionnaires */}
      {active.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Active — Requires your input</h2>
          <div className="space-y-3">
            {active.map(eng => {
              const fw = FRAMEWORKS[eng.framework_id as keyof typeof FRAMEWORKS];
              return (
                <div key={eng.id} className="bg-white border border-gray-200 rounded-lg shadow-xs p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary-50 flex items-center justify-center shrink-0 mt-0.5">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary-500" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"/>
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="framework" framework={eng.framework_id as 'soc2' | 'vdd' | 'financial_controls' | 'agnostic'} />
                          <Badge variant="status" status="info">In Progress</Badge>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">
                          {fw?.label ?? eng.framework_id}
                        </p>
                        {eng.due_date && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Due: <span className="font-medium text-danger-600">{eng.due_date}</span>
                          </p>
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
                      <span>Completion</span>
                      <span className="font-semibold text-primary-500">20%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full bg-primary-500 transition-all" style={{ width: '20%' }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed questionnaires */}
      {completed.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Completed</h2>
          <div className="bg-white border border-gray-200 rounded-lg shadow-xs divide-y divide-gray-50">
            {completed.map(eng => {
              const fw = FRAMEWORKS[eng.framework_id as keyof typeof FRAMEWORKS];
              return (
                <Link
                  key={eng.id}
                  href={`/vendor/questionnaires/${eng.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group"
                >
                  <div className="h-9 w-9 rounded-full bg-success-100 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-success-600" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{fw?.label ?? eng.framework_id}</p>
                    {eng.due_date && <p className="text-xs text-gray-400 mt-0.5">Completed {eng.due_date}</p>}
                  </div>
                  <Badge variant="status" status="success">Completed</Badge>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300 group-hover:text-gray-500 shrink-0" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
                  </svg>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {engagements.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-xs p-12 text-center">
          <div className="h-14 w-14 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary-500" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"/>
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-gray-800 mb-1">No questionnaires yet</h2>
          <p className="text-xs text-gray-500 max-w-xs mx-auto">
            A compliance officer will send you a questionnaire when a review is initiated. You'll see it here.
          </p>
        </div>
      )}
    </div>
  );
}
