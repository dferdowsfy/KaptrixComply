import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, AuditEntry } from '@/design-system';

export default async function GlobalAuditTrailPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: auditRows } = await supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <div className="max-w-screen-xl mx-auto space-y-6">
      <PageHeader
        title="Audit Trail"
        subtitle="All mutations across all engagements in your organization"
        breadcrumbs={[{ label: 'Dashboard', href: '/officer/dashboard' }, { label: 'Audit Trail' }]}
      />

      <div className="bg-white border border-gray-200 rounded-lg shadow-xs">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Activity Log</h2>
            <p className="text-xs text-gray-400 mt-0.5">{auditRows?.length ?? 0} entries — all organizations</p>
          </div>
          <button className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"/>
            </svg>
            Export CSV
          </button>
        </div>
        {!auditRows || auditRows.length === 0 ? (
          <div className="py-16 text-center">
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
              </svg>
            </div>
            <p className="text-sm text-gray-600 font-medium">No audit entries yet</p>
            <p className="text-xs text-gray-400 mt-1">Activity will appear here as engagements progress</p>
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
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
