import React from 'react';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, CardBody, Badge } from '@/design-system';
import { getEngagement, listRemediationActions, listGaps } from '@/lib/compliance/queries';
import { cn } from '@/lib/utils';
import type { RemediationStatus } from '@/lib/compliance/types';
import { EngagementActionBar } from '@/components/compliance/EngagementActionBar';

interface PageProps { params: Promise<{ id: string }> }

const columns: { key: RemediationStatus; label: string }[] = [
  { key: 'pending',     label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved',    label: 'Resolved' },
];

const columnStyles: Record<RemediationStatus, { border: string; header: string; countBg: string }> = {
  pending:     { border: 'border-t-gray-300',    header: 'text-gray-700',    countBg: 'bg-gray-100 text-gray-600' },
  in_progress: { border: 'border-t-warning-400', header: 'text-warning-700', countBg: 'bg-warning-100 text-warning-700' },
  resolved:    { border: 'border-t-success-500', header: 'text-success-700', countBg: 'bg-success-100 text-success-700' },
};

export default async function RemediationPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const engagement = await getEngagement(id);
  if (!engagement) notFound();

  const [actions, gaps] = await Promise.all([
    listRemediationActions(id),
    listGaps(id),
  ]);

  const gapMap = new Map(gaps.map(g => [g.id, g]));

  return (
    <div className="max-w-screen-xl mx-auto space-y-6">
      <PageHeader
        title="Remediation"
        subtitle="Track progress on closing compliance gaps"
        breadcrumbs={[
          { label: 'Vendors', href: '/officer/vendors' },
          { label: 'Engagement', href: `/officer/engagements/${id}/questionnaire` },
          { label: 'Remediation' },
        ]}
        actions={<EngagementActionBar engagementId={id} actions={['remediation']} />}
      />

      {/* Progress strip */}
      <div className="grid grid-cols-3 gap-4">
        {columns.map(col => {
          const count = actions.filter(a => a.status === col.key).length;
          const st = columnStyles[col.key];
          return (
            <div key={col.key} className="bg-white border border-gray-200 rounded-lg shadow-xs p-5">
              <p className="text-xs text-gray-500 mb-1">{col.label}</p>
              <p className={cn('text-3xl font-bold tabular-nums', st.header)}>{count}</p>
            </div>
          );
        })}
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {columns.map(col => {
          const colActions = actions.filter(a => a.status === col.key);
          const st = columnStyles[col.key];
          return (
            <div key={col.key}>
              <div className="flex items-center justify-between mb-3">
                <h2 className={cn('text-sm font-semibold', st.header)}>{col.label}</h2>
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-semibold', st.countBg)}>{colActions.length}</span>
              </div>
              <div className="flex flex-col gap-3">
                {colActions.length === 0 ? (
                  <div className={cn('border-t-2 rounded-lg border border-gray-200 bg-white p-4 text-xs text-gray-400 text-center', st.border)}>
                    No items
                  </div>
                ) : (
                  colActions.map(action => {
                    const gap = action.gap_id ? gapMap.get(action.gap_id) : null;
                    return (
                      <Card key={action.id} className={cn('border-t-2', st.border)}>
                        <CardBody className="py-3">
                          <p className="text-sm font-medium text-gray-800 mb-1">{action.title}</p>
                          {action.description && <p className="text-xs text-gray-500 mb-2">{action.description}</p>}
                          {gap && (
                            <div className="flex items-center gap-1.5 mb-2">
                              <span className="text-xs text-gray-400">Gap:</span>
                              <Badge variant="status" status="risk">{gap.severity}</Badge>
                              <span className="text-xs text-gray-600 truncate">{gap.title}</span>
                            </div>
                          )}
                          {action.due_date && (
                            <p className="text-xs text-gray-400">Due: {action.due_date}</p>
                          )}
                        </CardBody>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
