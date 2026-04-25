import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Badge, RiskMeter } from '@/design-system';
import { listOfficerEngagements, listScores } from '@/lib/compliance/queries';
import { FRAMEWORKS, DIMENSION_LABELS, computeCompositeScore, getDecision } from '@/lib/scoring/frameworks';
import type { DimensionId } from '@/lib/scoring/frameworks';
import { cn } from '@/lib/utils';

export default async function RiskScorePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const engagements = await listOfficerEngagements(user.id);
  const allScoresArrays = await Promise.all(engagements.map(e => listScores(e.id)));

  // Compute per-engagement composite scores
  const engagementScores = engagements.map((eng, i) => {
    const scores = allScoresArrays[i];
    const frameworkConfig = FRAMEWORKS[eng.framework_id as keyof typeof FRAMEWORKS];
    if (!scores.length || !frameworkConfig) return { eng, scores, composite: null, decision: null };
    const dimensionScores = Object.fromEntries(scores.map(s => [s.dimension, s.score ?? 0])) as Partial<Record<DimensionId, number>>;
    const composite = computeCompositeScore(dimensionScores, frameworkConfig.weights);
    const avgConf = scores.reduce((sum, s) => sum + (s.confidence ?? 0), 0) / scores.length;
    const decision = getDecision(composite, avgConf, frameworkConfig.decision_thresholds);
    return { eng, scores, composite, decision };
  });

  // Portfolio average
  const scoredEngagements = engagementScores.filter(e => e.composite != null);
  const portfolioAvg = scoredEngagements.length > 0
    ? Math.round(scoredEngagements.reduce((sum, e) => sum + (e.composite ?? 0), 0) / scoredEngagements.length)
    : null;

  const decisionStyles = {
    approved:    'bg-success-100 text-success-700',
    conditional: 'bg-warning-100 text-warning-700',
    high_risk:   'bg-danger-100 text-danger-700',
  };
  const decisionLabels = { approved: 'Approved', conditional: 'Conditional', high_risk: 'High Risk' };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Risk Score"
        subtitle="Composite compliance risk scores across all vendor assessments"
        breadcrumbs={[{ label: 'Dashboard', href: '/officer/dashboard' }, { label: 'Risk Score' }]}
      />

      {/* Portfolio average */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-xs p-6 flex flex-col items-center justify-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Portfolio Average</p>
        {portfolioAvg != null ? (
          <>
            <RiskMeter score={portfolioAvg} />
            <p className="mt-2 text-xs text-gray-400">{scoredEngagements.length} of {engagements.length} engagement{engagements.length !== 1 ? 's' : ''} scored</p>
          </>
        ) : (
          <div className="py-4 text-sm text-gray-400">No scores computed yet — upload evidence and compute scores on individual engagements.</div>
        )}
      </div>

      {/* Engagement risk list */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-xs">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Risk Score by Engagement</h2>
            <p className="text-xs text-gray-400 mt-0.5">Click any row to see full score detail</p>
          </div>
        </div>
        {engagements.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-500 mb-2">No engagements to score yet.</p>
            <Link href="/officer/vendors" className="text-sm text-primary-500 font-medium hover:underline">
              Start a vendor assessment →
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Vendor', 'Framework', 'Risk Score', 'Decision', 'Status', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {engagementScores.map(({ eng, composite, decision }) => {
                const vendorLabel = eng.vendor_company?.trim() || eng.vendor_email?.trim() || eng.vendor_user_id || '—';
                return (
                  <tr key={eng.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-gray-900">{vendorLabel}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant="framework" framework={eng.framework_id as 'soc2' | 'vdd' | 'financial_controls' | 'agnostic'} />
                    </td>
                    <td className="px-5 py-3.5">
                      {composite != null
                        ? <RiskMeter score={composite} mini />
                        : <span className="text-xs text-gray-400">Not scored</span>
                      }
                    </td>
                    <td className="px-5 py-3.5">
                      {decision ? (
                        <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold', decisionStyles[decision])}>
                          {decisionLabels[decision]}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant="status" status={eng.status === 'in_review' ? 'info' : eng.status === 'completed' ? 'success' : 'neutral'}>
                        {eng.status === 'in_review' ? 'In Progress' : eng.status === 'completed' ? 'Completed' : 'Draft'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <Link href={`/officer/engagements/${eng.id}/risk-score`} className="text-xs text-primary-500 hover:text-primary-600 font-medium">
                        Full Detail →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
