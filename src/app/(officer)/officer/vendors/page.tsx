import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Badge, RiskMeter } from '@/design-system';
import { listOfficerEngagements } from '@/lib/compliance/queries';
import { FRAMEWORKS } from '@/lib/scoring/frameworks';

export default async function VendorsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const engagements = await listOfficerEngagements(user.id);

  const getVendorLabel = (eng: typeof engagements[number]) =>
    eng.vendor_company?.trim() || eng.vendor_email?.trim() || eng.vendor_user_id || '—';

  return (
    <div className="max-w-screen-xl mx-auto space-y-6">
      <PageHeader
        title="Vendors"
        subtitle="All vendor engagements under your review"
        breadcrumbs={[{ label: 'Dashboard', href: '/officer/dashboard' }, { label: 'Vendors' }]}
        actions={
          <a
            href="/officer/vendors/new"
            className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-semibold rounded-md bg-primary-500 text-white hover:bg-primary-600 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
            </svg>
            New Engagement
          </a>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total',      value: engagements.length,                                            color: 'text-gray-900' },
          { label: 'In Review',  value: engagements.filter(e => e.status === 'in_review').length,      color: 'text-info-600' },
          { label: 'Completed',  value: engagements.filter(e => e.status === 'completed').length,      color: 'text-success-600' },
          { label: 'Draft',      value: engagements.filter(e => e.status === 'draft').length,          color: 'text-gray-500' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-lg shadow-xs p-5">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-3xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-xs">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">All Engagements</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Vendor', 'Framework', 'Risk Score', 'Open Gaps', 'Status', 'Due Date', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {engagements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"/>
                      </svg>
                    </div>
                    <p className="text-sm text-gray-600 font-medium mb-1">No vendors yet</p>
                    <p className="text-xs text-gray-400 mb-3">Create an engagement to begin a vendor review</p>
                    <a href="/officer/vendors/new" className="text-sm text-primary-500 font-medium hover:underline">
                      New engagement →
                    </a>
                  </td>
                </tr>
              ) : (
                engagements.map(eng => (
                  <tr key={eng.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-gray-900">{getVendorLabel(eng)}</div>
                      {eng.vendor_email && eng.vendor_email !== getVendorLabel(eng) && (
                        <div className="text-xs text-gray-400 mt-0.5">{eng.vendor_email}</div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant="framework" framework={eng.framework_id as keyof typeof FRAMEWORKS} />
                    </td>
                    <td className="px-5 py-3.5"><RiskMeter score={0} mini /></td>
                    <td className="px-5 py-3.5 text-gray-500 tabular-nums text-xs">—</td>
                    <td className="px-5 py-3.5">
                      <Badge variant="status" status={eng.status === 'in_review' ? 'info' : eng.status === 'completed' ? 'success' : 'neutral'}>
                        {eng.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">{eng.due_date ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Link href={`/officer/engagements/${eng.id}/questionnaire`} className="text-xs text-primary-500 hover:text-primary-600 font-medium">
                          Review
                        </Link>
                        <Link href={`/officer/engagements/${eng.id}/report`} className="text-xs text-gray-400 hover:text-gray-600">
                          Report
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
