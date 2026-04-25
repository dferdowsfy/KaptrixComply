import React from 'react';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Badge } from '@/design-system';
import { getEngagement, getEngagementContext, listGaps } from '@/lib/compliance/queries';
import { cn } from '@/lib/utils';
import type { GapSeverity } from '@/lib/compliance/types';
import { EngagementActionBar } from '@/components/compliance/EngagementActionBar';
import { EngagementContextHeader } from '@/components/officer/EngagementContextHeader';

interface PageProps { params: Promise<{ id: string }> }

const severityOrder: GapSeverity[] = ['critical', 'high', 'medium', 'low'];

const SEVERITY_STYLES = {
  critical: { border: 'border-l-danger-500',  badge: 'bg-danger-100 text-danger-700' },
  high:     { border: 'border-l-danger-400',  badge: 'bg-danger-100 text-danger-700' },
  medium:   { border: 'border-l-warning-400', badge: 'bg-warning-100 text-warning-700' },
  low:      { border: 'border-l-gray-300',    badge: 'bg-gray-100 text-gray-600' },
};

export default async function GapsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const engagement = await getEngagement(id);
  if (!engagement) notFound();

  const [gaps, context] = await Promise.all([
    listGaps(id),
    getEngagementContext(engagement, user.id),
  ]);
  const openGapCount = gaps.filter(g => g.status === 'open').length;
  const categories = [...new Set(gaps.map(g => g.control_category))];

  return (
    <div className="max-w-screen-xl mx-auto space-y-6">
      <EngagementContextHeader
        engagement={engagement}
        orgName={context.orgName}
        workflow={context.workflow}
        activeStepKey="gaps"
      />
      <PageHeader
        title="Gap Review"
        subtitle="Missing or weak evidence — focus the conversation on what still needs to land."
        breadcrumbs={[
          { label: 'Engagements', href: '/officer/engagements' },
          { label: 'Workspace', href: `/officer/engagements/${id}` },
          { label: 'Gap Review' },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{openGapCount} open gap{openGapCount === 1 ? '' : 's'}</span>
            <EngagementActionBar engagementId={id} actions={['gaps']} />
          </div>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-4">
        {(['critical', 'high', 'medium', 'low'] as const).map(s => {
          const count = gaps.filter(g => g.severity === s).length;
          const st = SEVERITY_STYLES[s];
          return (
            <div key={s} className="bg-white border border-gray-200 rounded-lg shadow-xs p-4 text-center">
              <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize mb-2', st.badge)}>
                {s}
              </span>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{count}</p>
            </div>
          );
        })}
      </div>

      {gaps.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg shadow-xs p-12 text-center">
          <div className="h-14 w-14 rounded-full bg-success-100 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-success-600" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-800 mb-1">No gaps identified</p>
          <p className="text-xs text-gray-500">All controls have sufficient evidence coverage.</p>
        </div>
      ) : (
        categories.map(category => {
          const catGaps = gaps.filter(g => g.control_category === category)
            .sort((a, b) => severityOrder.indexOf(a.severity as GapSeverity) - severityOrder.indexOf(b.severity as GapSeverity));
          return (
            <div key={category}>
              <h2 className="text-sm font-semibold text-gray-700 mb-3">{category}</h2>
              <div className="space-y-3">
                {catGaps.map(gap => {
                  const st = SEVERITY_STYLES[gap.severity as keyof typeof SEVERITY_STYLES] ?? SEVERITY_STYLES.low;
                  return (
                    <div
                      key={gap.id}
                      className={cn('bg-white border border-gray-200 rounded-lg shadow-xs border-l-4 overflow-hidden', st.border)}
                    >
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize', st.badge)}>
                                {gap.severity}
                              </span>
                              <h3 className="text-sm font-semibold text-gray-900">{gap.title}</h3>
                            </div>
                            {gap.description && <p className="text-sm text-gray-600 mb-2">{gap.description}</p>}
                            {gap.why_it_matters && (
                              <p className="text-xs text-gray-500 italic mb-2">
                                <strong className="not-italic font-semibold text-gray-600">Why it matters: </strong>
                                {gap.why_it_matters}
                              </p>
                            )}
                            {(gap.suggested_evidence ?? []).length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                <span className="text-xs text-gray-400 font-medium">Suggested:</span>
                                {(gap.suggested_evidence ?? []).map(e => (
                                  <span key={e} className="px-2 py-0.5 text-xs bg-primary-50 text-primary-600 rounded-full font-medium">{e.replace(/_/g, ' ')}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-2">
                            <Badge variant="status" status={gap.status === 'open' ? 'risk' : gap.status === 'resolved' ? 'success' : 'warning'}>
                              {gap.status.replace('_', ' ')}
                            </Badge>
                            <button className="text-xs text-primary-500 hover:text-primary-600 font-medium">Request from vendor</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
