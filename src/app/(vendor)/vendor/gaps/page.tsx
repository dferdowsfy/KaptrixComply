import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/design-system';
import { listVendorEngagements, listGaps } from '@/lib/compliance/queries';
import { cn } from '@/lib/utils';

const SEVERITY_STYLES = {
  critical: { bg: 'bg-danger-50',  border: 'border-l-danger-500',  badge: 'bg-danger-100 text-danger-700',  icon: 'text-danger-600' },
  high:     { bg: 'bg-danger-50',  border: 'border-l-danger-400',  badge: 'bg-danger-100 text-danger-700',  icon: 'text-danger-500' },
  medium:   { bg: 'bg-warning-50', border: 'border-l-warning-400', badge: 'bg-warning-100 text-warning-700', icon: 'text-warning-600' },
  low:      { bg: 'bg-gray-50',    border: 'border-l-gray-300',    badge: 'bg-gray-100 text-gray-600',       icon: 'text-gray-500' },
};

export default async function VendorGapsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const engagements = await listVendorEngagements(user.id);
  const allGaps = (await Promise.all(engagements.map(e => listGaps(e.id)))).flat();
  const openGaps = allGaps.filter(g => g.status === 'open' || g.status === 'in_progress');
  const severityOrder = ['critical', 'high', 'medium', 'low'];
  const sorted = [...openGaps].sort((a, b) =>
    severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Compliance Gaps"
        subtitle="Items your reviewer has flagged as missing or insufficient evidence"
        breadcrumbs={[{ label: 'Dashboard', href: '/vendor/dashboard' }, { label: 'Gaps' }]}
      />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {(['critical', 'high', 'medium', 'low'] as const).map(s => {
          const count = sorted.filter(g => g.severity === s).length;
          const c = SEVERITY_STYLES[s];
          return (
            <div key={s} className="bg-white border border-gray-200 rounded-lg shadow-xs p-4 text-center">
              <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize mb-2', c.badge)}>
                {s}
              </span>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{count}</p>
            </div>
          );
        })}
      </div>

      {sorted.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg shadow-xs p-12 text-center">
          <div className="h-14 w-14 rounded-full bg-success-100 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-success-600" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-gray-800 mb-1">No open gaps</h2>
          <p className="text-xs text-gray-500">Your reviewer hasn't flagged any missing evidence. Keep it up!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(gap => {
            const s = SEVERITY_STYLES[gap.severity as keyof typeof SEVERITY_STYLES] ?? SEVERITY_STYLES.low;
            return (
              <div
                key={gap.id}
                className={cn('bg-white border border-gray-200 rounded-lg shadow-xs border-l-4 overflow-hidden', s.border)}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize', s.badge)}>
                          {gap.severity}
                        </span>
                        <span className="text-xs text-gray-400">{gap.control_category}</span>
                        {gap.status === 'in_progress' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-info-100 text-info-700">
                            In Progress
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">{gap.title}</h3>
                      {gap.description && (
                        <p className="text-sm text-gray-600 mb-2">{gap.description}</p>
                      )}
                      {gap.why_it_matters && (
                        <p className="text-xs text-gray-500 italic mb-3">
                          <strong className="not-italic font-semibold text-gray-600">Why it matters: </strong>
                          {gap.why_it_matters}
                        </p>
                      )}
                      {(gap.suggested_evidence ?? []).length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <span className="text-xs text-gray-400 font-medium">Suggested:</span>
                          {(gap.suggested_evidence ?? []).map(e => (
                            <span key={e} className="px-2 py-0.5 text-xs bg-primary-50 text-primary-600 rounded-full font-medium">
                              {e.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0">
                      <Link
                        href="/vendor/evidence"
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md bg-primary-500 text-white hover:bg-primary-600 transition-colors"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"/>
                        </svg>
                        Upload Evidence
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
