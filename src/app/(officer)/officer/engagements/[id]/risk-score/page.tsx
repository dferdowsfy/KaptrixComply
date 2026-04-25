import React from 'react';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, CardBody, RiskMeter, ConfidenceBadge, ProgressBar } from '@/design-system';
import { getEngagement, getEngagementContext, listScores, listAnswers, listGaps } from '@/lib/compliance/queries';
import { FRAMEWORKS, DIMENSION_LABELS, computeCompositeScore, getDecision } from '@/lib/scoring/frameworks';
import type { DimensionId } from '@/lib/scoring/frameworks';
import { EngagementActionBar } from '@/components/compliance/EngagementActionBar';
import { EngagementContextHeader } from '@/components/officer/EngagementContextHeader';

interface PageProps { params: Promise<{ id: string }> }

export default async function RiskScorePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const engagement = await getEngagement(id);
  if (!engagement) notFound();

  const frameworkConfig = FRAMEWORKS[engagement.framework_id as keyof typeof FRAMEWORKS];
  const [scores, answers, gaps, context] = await Promise.all([
    listScores(id),
    listAnswers(id),
    listGaps(id),
    getEngagementContext(engagement, user.id),
  ]);

  const dimensionScores = Object.fromEntries(
    scores.map(s => [s.dimension, s.score ?? 0])
  ) as Partial<Record<DimensionId, number>>;

  const compositeScore = scores.length > 0
    ? computeCompositeScore(dimensionScores, frameworkConfig?.weights ?? [])
    : null;

  const avgConfidence = scores.length > 0
    ? scores.reduce((sum, s) => sum + (s.confidence ?? 0), 0) / scores.length
    : null;

  const decision = compositeScore != null && avgConfidence != null && frameworkConfig
    ? getDecision(compositeScore, avgConfidence, frameworkConfig.decision_thresholds)
    : null;

  const decisionStyles = {
    approved:    { bg: 'bg-success-600',  label: 'APPROVED' },
    conditional: { bg: 'bg-warning-500',  label: 'CONDITIONAL' },
    high_risk:   { bg: 'bg-danger-600',   label: 'HIGH RISK' },
  };

  return (
    <div className="max-w-screen-xl mx-auto space-y-6">
      <EngagementContextHeader
        engagement={engagement}
        orgName={context.orgName}
        workflow={context.workflow}
        activeStepKey="score"
      />
      <PageHeader
        title="Risk Score"
        subtitle={frameworkConfig?.label ?? engagement.framework_id}
        breadcrumbs={[
          { label: 'Engagements', href: '/officer/engagements' },
          { label: 'Workspace', href: `/officer/engagements/${id}` },
          { label: 'Risk Score' },
        ]}
        actions={<EngagementActionBar engagementId={id} actions={['scores']} />}
      />

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardBody>
            {compositeScore != null ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-sm font-semibold text-gray-700">Composite Risk Score</h2>
                  {avgConfidence != null && <ConfidenceBadge confidence={avgConfidence} />}
                </div>
                <RiskMeter score={compositeScore} />
              </>
            ) : (
              <div className="py-8 text-center text-sm text-gray-500">
                Score not yet computed. Evidence must be uploaded and extracted first.
              </div>
            )}
          </CardBody>
        </Card>

        {decision && (
          <Card>
            <CardBody className="flex flex-col items-center justify-center py-8">
              <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide">Compliance Decision</p>
              <div className={`px-6 py-3 rounded-lg text-lg font-bold text-white ${decisionStyles[decision].bg}`}>
                {decisionStyles[decision].label}
              </div>
              {frameworkConfig && (
                <p className="text-xs text-gray-400 mt-3 text-center">
                  Based on {frameworkConfig.label} thresholds
                </p>
              )}
            </CardBody>
          </Card>
        )}
      </div>

      {frameworkConfig && (
        <Card>
          <CardBody className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Score Breakdown by Dimension</h2>
            <p className="text-xs text-gray-500 mt-0.5">Weights applied per {frameworkConfig.label}</p>
          </CardBody>
          <CardBody>
            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Dimension</th>
                  <th className="pb-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Weight</th>
                  <th className="pb-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-48">Score</th>
                  <th className="pb-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {frameworkConfig.weights.map(({ dimension, weight }) => {
                  const score = dimensionScores[dimension];
                  const dimScore = scores.find(s => s.dimension === dimension);
                  return (
                    <tr key={dimension} className="border-b border-gray-50">
                      <td className="py-3 font-medium text-gray-800">{DIMENSION_LABELS[dimension]}</td>
                      <td className="py-3 text-gray-500 tabular-nums font-mono text-xs">{(weight * 100).toFixed(0)}%</td>
                      <td className="py-3 pr-4">
                        {score != null ? (
                          <ProgressBar
                            value={score}
                            showValue
                            color={score >= 70 ? 'success' : score >= 40 ? 'warning' : 'danger'}
                          />
                        ) : (
                          <span className="text-xs text-gray-400">Not scored</span>
                        )}
                      </td>
                      <td className="py-3">
                        {dimScore?.confidence != null
                          ? <ConfidenceBadge confidence={dimScore.confidence} />
                          : <span className="text-xs text-gray-400">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="mt-4 p-4 bg-gray-50 rounded-lg text-xs text-gray-600 border border-gray-100">
              <p className="font-semibold text-gray-700 mb-1">How this score was calculated</p>
              <p>Composite = Σ(dimension_score × dimension_weight) across {frameworkConfig.weights.length} dimensions. Weights for {frameworkConfig.label}: {frameworkConfig.weights.map(w => `${DIMENSION_LABELS[w.dimension]} ${(w.weight * 100).toFixed(0)}%`).join(', ')}.</p>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
