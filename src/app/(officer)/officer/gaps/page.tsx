import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Badge } from '@/design-system';
import { listOfficerEngagements, listGaps } from '@/lib/compliance/queries';
import { cn } from '@/lib/utils';

const SEVERITY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  critical: { bg: 'bg-danger-50',  text: 'text-danger-700',  dot: 'bg-danger-500' },
  high:     { bg: 'bg-danger-50',  text: 'text-danger-700',  dot: 'bg-danger-500' },
  medium:   { bg: 'bg-warning-50', text: 'text-warning-700', dot: 'bg-warning-500' },
  low:      { bg: 'bg-gray-50',    text: 'text-gray-600',    dot: 'bg-gray-400' },
};

export default async function GapsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const engagements = await listOfficerEngagements(user.id);
  const allGapsArrays = await Promise.all(engagements.map(e => listGaps(e.id)));
  const allGaps = allGapsArrays.flat();
  const openGaps = allGaps.filter(g => g.status === 'open');

  const counts = {
    total:    openGaps.length,
    critical: openGaps.filter(g => g.severity === 'critical').length,
    high:     openGaps.filter(g => g.severity === 'high').length,
    medium:   openGaps.filter(g => g.severity === 'medium').length,
    low:      openGaps.filter(g => g.severity === 'low').length,
  };

  // Per-engagement gap counts
  const gapsByEngagement = engagements.map((eng, i) => ({
    eng,
    gaps: allGapsArrays[i],
    openCount: allGapsArrays[i].filter(g => g.status === 'open').length,
    criticalCount: allGapsArrays[i].filter(g => g.severity === 'critical' && g.status === 'open').length,
  }));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Compliance Gaps"
        subtitle="Missing or insufficient evidence across all vendor assessments"
        breadcrumbs={[{ label: 'Dashboard', href: '/officer/dashboard' }, { label: 'Compliance Gaps' }]}
      />

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Open Gaps',  value: counts.total,    color: '#EF4444' },
          { label: 'Critical',   value: counts.critical, color: '#B91C1C' },
          { label: 'High',       value: counts.high,     color: '#DC2626' },
          { label: 'Medium',     value: counts.medium,   color: '#D97706' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-lg shadow-xs p-5">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-3xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Severity breakdown */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-xs p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Gaps by Severity</h2>
        <div className="space-y-2">
          {(['critical', 'high', 'medium', 'low'] as const).map(severity => {
            const c = SEVERITY_COLORS[severity];
            return (
              <div key={severity} className={cn('flex items-center justify-between px-3 py-2.5 rounded-md', c.bg)}>
                <div className="flex items-center gap-2.5">
                  <span className={cn('h-2 w-2 rounded-full', c.dot)} aria-hidden="true" />
                  <span className={cn('text-sm font-medium capitalize', c.text)}>{severity}</span>
                </div>
                <span className={cn('text-sm font-bold tabular-nums', c.text)}>{counts[severity]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Engagement list */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-xs">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Gaps by Engagement</h2>
          <p className="text-xs text-gray-400 mt-0.5">Select an engagement to see detailed gap analysis</p>
        </div>
        {engagements.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-500">No active engagements.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {gapsByEngagement.map(({ eng, openCount, criticalCount }) => {
              const vendorLabel = eng.vendor_company?.trim() || eng.vendor_email?.trim() || eng.vendor_user_id || '—';
              return (
                <Link
                  key={eng.id}
                  href={`/officer/engagements/${eng.id}/gaps`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group"
                >
                  <div className="h-10 w-10 rounded-full bg-danger-50 flex items-center justify-center shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-danger-600" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{vendorLabel}</p>
                    <Badge variant="framework" framework={eng.framework_id as 'soc2' | 'vdd' | 'financial_controls' | 'agnostic'} />
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-xs">
                    {criticalCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-danger-100 text-danger-700 font-semibold">
                        {criticalCount} critical
                      </span>
                    )}
                    <span className="text-gray-500">{openCount} open gap{openCount !== 1 ? 's' : ''}</span>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300 group-hover:text-gray-500 shrink-0" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
                  </svg>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
