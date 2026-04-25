import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Badge } from '@/design-system';
import { listOfficerEngagements } from '@/lib/compliance/queries';
import { cn } from '@/lib/utils';

type KanbanCol = { key: string; label: string; count: number; accent: string; bg: string };

const KANBAN_COLS: KanbanCol[] = [
  { key: 'pending',     label: 'Pending',     count: 6,  accent: 'border-t-gray-300',    bg: 'bg-gray-50' },
  { key: 'in_progress', label: 'In Progress', count: 4,  accent: 'border-t-warning-400', bg: 'bg-warning-50' },
  { key: 'resolved',    label: 'Resolved',    count: 8,  accent: 'border-t-success-500', bg: 'bg-success-50' },
];

const SAMPLE_ACTIONS = [
  { id: '1', col: 'pending',     title: 'Document incident response procedures',    severity: 'high',     due: 'Jun 15, 2025' },
  { id: '2', col: 'pending',     title: 'Implement quarterly access reviews',        severity: 'high',     due: 'Jun 30, 2025' },
  { id: '3', col: 'pending',     title: 'Formalize vendor onboarding checklist',     severity: 'medium',   due: 'Jul 10, 2025' },
  { id: '4', col: 'in_progress', title: 'Deploy MFA across all admin accounts',      severity: 'critical', due: 'May 31, 2025' },
  { id: '5', col: 'in_progress', title: 'Draft data retention policy v2',            severity: 'medium',   due: 'Jun 5, 2025' },
  { id: '6', col: 'resolved',    title: 'Encrypt data at rest (S3 buckets)',         severity: 'high',     due: null },
  { id: '7', col: 'resolved',    title: 'Complete SOC 2 Type I audit',               severity: 'high',     due: null },
];

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-danger-100 text-danger-700',
  high:     'bg-danger-100 text-danger-700',
  medium:   'bg-warning-100 text-warning-700',
  low:      'bg-gray-100 text-gray-600',
};

export default async function RemediationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const engagements = await listOfficerEngagements(user.id);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Remediation"
        subtitle="Track and close compliance gaps across all vendor assessments"
        breadcrumbs={[{ label: 'Dashboard', href: '/officer/dashboard' }, { label: 'Remediation' }]}
      />

      {/* Progress strip */}
      <div className="grid grid-cols-3 gap-4">
        {KANBAN_COLS.map(col => (
          <div key={col.key} className="bg-white border border-gray-200 rounded-lg shadow-xs p-5">
            <p className="text-xs text-gray-500 mb-1">{col.label}</p>
            <p className={cn('text-3xl font-bold tabular-nums', col.key === 'resolved' ? 'text-success-600' : col.key === 'in_progress' ? 'text-warning-600' : 'text-gray-700')}>{col.count}</p>
            <p className="text-xs text-gray-400 mt-1">action items</p>
          </div>
        ))}
      </div>

      {/* Kanban board — aggregate sample */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Action Board</h2>
          <p className="text-xs text-gray-400">Showing portfolio-wide sample — select an engagement for full detail</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {KANBAN_COLS.map(col => {
            const colActions = SAMPLE_ACTIONS.filter(a => a.col === col.key);
            return (
              <div key={col.key}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700">{col.label}</h3>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{col.count}</span>
                </div>
                <div className="space-y-2">
                  {colActions.map(action => (
                    <div key={action.id} className={cn('bg-white border border-gray-200 rounded-lg p-4 border-t-2', col.accent)}>
                      <p className="text-sm font-medium text-gray-800 mb-2 leading-snug">{action.title}</p>
                      <div className="flex items-center justify-between">
                        <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize', SEVERITY_STYLES[action.severity])}>
                          {action.severity}
                        </span>
                        {action.due && <span className="text-[11px] text-gray-400">Due {action.due}</span>}
                        {!action.due && col.key === 'resolved' && (
                          <span className="text-[11px] text-success-600 font-medium flex items-center gap-1">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                            </svg>
                            Resolved
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Engagement drill-in */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-xs">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Remediation by Engagement</h2>
        </div>
        {engagements.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-500">No engagements yet.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {engagements.map(eng => (
              <Link
                key={eng.id}
                href={`/officer/engagements/${eng.id}/remediation`}
                className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-colors group"
              >
                <div className="h-8 w-8 rounded-full bg-warning-100 flex items-center justify-center shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="text-warning-600" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{eng.vendor_user_id ?? 'Unnamed Vendor'}</p>
                  <Badge variant="framework" framework={eng.framework_id as 'soc2' | 'vdd' | 'financial_controls' | 'agnostic'} />
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300 group-hover:text-gray-500 shrink-0" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
                </svg>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
