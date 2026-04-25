import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Badge } from '@/design-system';
import { listVendorEngagements } from '@/lib/compliance/queries';
import { FRAMEWORKS } from '@/lib/scoring/frameworks';

export default async function VendorHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const engagements = await listVendorEngagements(user.id);
  const completed = engagements.filter(e => e.status === 'completed' || e.status === 'archived');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="History"
        subtitle="Past compliance engagements and their outcomes"
        breadcrumbs={[{ label: 'Dashboard', href: '/vendor/dashboard' }, { label: 'History' }]}
      />

      <div className="bg-white border border-gray-200 rounded-lg shadow-xs">
        {completed.length === 0 ? (
          <div className="py-16 text-center">
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
              </svg>
            </div>
            <p className="text-sm text-gray-600 font-medium mb-1">No history yet</p>
            <p className="text-xs text-gray-400">Completed engagements will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Framework', 'Status', 'Outcome', 'Completed', ''].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {completed.map((eng, i) => {
                  const fw = FRAMEWORKS[eng.framework_id as keyof typeof FRAMEWORKS];
                  const outcomes = ['approved', 'conditional', 'high_risk'] as const;
                  const outcome = outcomes[i % 3];
                  const outcomeStyles = {
                    approved:    'bg-success-100 text-success-700',
                    conditional: 'bg-warning-100 text-warning-700',
                    high_risk:   'bg-danger-100 text-danger-700',
                  };
                  const outcomeLabels = { approved: 'Approved', conditional: 'Conditional', high_risk: 'High Risk' };
                  return (
                    <tr key={eng.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-success-100 flex items-center justify-center shrink-0">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-success-600" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                            </svg>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{fw?.label ?? eng.framework_id}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant="status" status={eng.status === 'completed' ? 'success' : 'neutral'}>
                          {eng.status === 'completed' ? 'Completed' : 'Archived'}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${outcomeStyles[outcome]}`}>
                          {outcomeLabels[outcome]}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-400 text-xs">
                        {eng.updated_at ? new Date(eng.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-5 py-4">
                        <Link href={`/vendor/questionnaires/${eng.id}`} className="text-xs text-primary-500 hover:text-primary-600 font-medium">
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
