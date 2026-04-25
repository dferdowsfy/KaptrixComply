import React from 'react';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, CardBody } from '@/design-system';
import { getEngagement, getEngagementContext, getLatestReport, listGaps, listScores } from '@/lib/compliance/queries';
import { FRAMEWORKS, computeCompositeScore, getDecision } from '@/lib/scoring/frameworks';
import type { DimensionId } from '@/lib/scoring/frameworks';
import { EngagementActionBar } from '@/components/compliance/EngagementActionBar';
import { EngagementContextHeader } from '@/components/officer/EngagementContextHeader';

interface PageProps { params: Promise<{ id: string }> }

export default async function ReportPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const engagement = await getEngagement(id);
  if (!engagement) notFound();

  const [report, gaps, scores, context] = await Promise.all([
    getLatestReport(id),
    listGaps(id),
    listScores(id),
    getEngagementContext(engagement, user.id),
  ]);

  const frameworkConfig = FRAMEWORKS[engagement.framework_id as keyof typeof FRAMEWORKS];
  const dimensionScores = Object.fromEntries(scores.map(s => [s.dimension, s.score ?? 0])) as Partial<Record<DimensionId, number>>;
  const compositeScore = scores.length > 0 ? computeCompositeScore(dimensionScores, frameworkConfig?.weights ?? []) : null;
  const avgConfidence = scores.length > 0 ? scores.reduce((sum, s) => sum + (s.confidence ?? 0), 0) / scores.length : null;

  const decision = report?.decision
    ?? (compositeScore != null && avgConfidence != null && frameworkConfig
      ? getDecision(compositeScore, avgConfidence, frameworkConfig.decision_thresholds)
      : null);

  const decisionBanner = {
    approved:    { label: 'APPROVED',            bg: 'bg-success-600',  desc: 'This vendor meets the compliance requirements.' },
    conditional: { label: 'CONDITIONAL APPROVAL', bg: 'bg-warning-500', desc: 'This vendor meets most requirements but has open conditions that must be resolved.' },
    high_risk:   { label: 'HIGH RISK',            bg: 'bg-danger-600',  desc: 'This vendor has critical compliance gaps. Engagement at your discretion.' },
  };

  const openGaps = gaps.filter(g => g.status === 'open');
  const criticalGaps = openGaps.filter(g => g.severity === 'critical' || g.severity === 'high');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <EngagementContextHeader
        engagement={engagement}
        orgName={context.orgName}
        workflow={context.workflow}
        activeStepKey="report"
      />
      <PageHeader
        title="Compliance Decision Report"
        subtitle={frameworkConfig?.label ?? engagement.framework_id}
        breadcrumbs={[
          { label: 'Engagements', href: '/officer/engagements' },
          { label: 'Workspace', href: `/officer/engagements/${id}` },
          { label: 'Report' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <EngagementActionBar engagementId={id} actions={['scores', 'gaps', 'remediation', 'report']} />
            <a
              href={`/officer/engagements/${id}/questionnaire/export`}
              className="inline-flex items-center gap-2 h-9 px-4 text-sm font-medium rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
              </svg>
              Export PDF
            </a>
          </div>
        }
      />

      {decision && (
        <div className={`${decisionBanner[decision].bg} text-white rounded-lg px-6 py-5`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium opacity-80 mb-0.5">{frameworkConfig?.label}</p>
              <h2 className="text-2xl font-bold">{decisionBanner[decision].label}</h2>
              <p className="text-sm opacity-90 mt-1">{decisionBanner[decision].desc}</p>
            </div>
            {compositeScore != null && (
              <div className="text-right">
                <p className="text-4xl font-bold tabular-nums">{Math.round(compositeScore)}</p>
                <p className="text-sm opacity-80">/ 100</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        <Card>
          <CardBody className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Top Risks</h3>
          </CardBody>
          <CardBody>
            {criticalGaps.length === 0 ? (
              <p className="text-sm text-gray-500">No critical risks identified.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {criticalGaps.slice(0, 5).map(gap => (
                  <li key={gap.id} className="flex items-start gap-2 text-sm">
                    <span className="h-4 w-4 rounded-full bg-danger-100 text-danger-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5" aria-hidden="true">!</span>
                    <span className="text-gray-700">{gap.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Gap Summary</h3>
          </CardBody>
          <CardBody>
            <div className="grid grid-cols-2 gap-3">
              {(['critical', 'high', 'medium', 'low'] as const).map(severity => {
                const count = openGaps.filter(g => g.severity === severity).length;
                return (
                  <div key={severity} className="text-center">
                    <p className="text-2xl font-bold text-gray-900 tabular-nums">{count}</p>
                    <p className="text-xs text-gray-500 capitalize">{severity}</p>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      </div>

      {report?.raw_content ? (
        <Card>
          <CardBody>
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">{report.raw_content}</div>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody>
            <div className="py-8 text-center text-sm text-gray-500">
              Full report has not been generated yet.
              <div className="mt-3 flex justify-center">
                <EngagementActionBar engagementId={id} actions={['report']} />
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="text-xs text-gray-500 flex items-center gap-1">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        Every mutation in this report is traceable.{' '}
        <a href={`/officer/engagements/${id}/audit-trail`} className="text-primary-500 hover:text-primary-600 font-medium ml-0.5">View audit trail →</a>
      </div>
    </div>
  );
}
