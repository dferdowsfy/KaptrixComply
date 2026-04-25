import React from 'react';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, CardBody, AuditEntry } from '@/design-system';
import { getEngagement } from '@/lib/compliance/queries';

interface PageProps { params: Promise<{ id: string }> }

export default async function AuditTrailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const engagement = await getEngagement(id);
  if (!engagement) notFound();

  const { data: auditRows } = await supabase
    .from('audit_log')
    .select('*')
    .eq('engagement_id', id)
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div className="max-w-screen-xl mx-auto space-y-6">
      <PageHeader
        title="Audit Trail"
        subtitle="All mutations for this engagement, in chronological order"
        breadcrumbs={[
          { label: 'Vendors', href: '/officer/vendors' },
          { label: 'Engagement', href: `/officer/engagements/${id}/questionnaire` },
          { label: 'Audit Trail' },
        ]}
      />

      <div className="bg-white border border-gray-200 rounded-lg shadow-xs">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Activity Log</h2>
          <p className="text-xs text-gray-400 mt-0.5">{auditRows?.length ?? 0} entries</p>
        </div>
        {!auditRows || auditRows.length === 0 ? (
          <div className="py-16 text-center">
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
              </svg>
            </div>
            <p className="text-sm text-gray-600 font-medium">No audit entries yet</p>
            <p className="text-xs text-gray-400 mt-1">Activity will be logged as this engagement progresses</p>
          </div>
        ) : (
          <div className="px-4 py-2">
            {auditRows.map((row: Record<string, unknown>) => (
              <AuditEntry
                key={String(row.id)}
                actor={String(row.actor ?? row.user_id ?? 'System')}
                timestamp={String(row.created_at)}
                action={String(row.action ?? row.event_type ?? 'Updated')}
                entity={row.entity ? String(row.entity) : undefined}
                diff={row.before || row.after ? {
                  before: row.before ? JSON.stringify(row.before, null, 2) : undefined,
                  after: row.after ? JSON.stringify(row.after, null, 2) : undefined,
                } : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
