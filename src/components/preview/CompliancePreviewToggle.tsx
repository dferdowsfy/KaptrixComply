'use client';
import React, { useState } from 'react';
import { Badge } from '@/design-system';
import { Card, CardBody, CardHeader } from '@/design-system';
import { RiskMeter, ConfidenceBadge } from '@/design-system';
import { EvidenceSnippet } from '@/design-system';
import {
  PREVIEW_ENGAGEMENT,
  PREVIEW_QUESTIONS,
  PREVIEW_ANSWERS,
  PREVIEW_DOCUMENTS,
  PREVIEW_EVIDENCE_LINKS,
  PREVIEW_GAPS,
  PREVIEW_REPORT,
  PREVIEW_SCORES,
} from '@/lib/compliance/preview-data';
import { FRAMEWORKS, DIMENSION_LABELS, computeCompositeScore } from '@/lib/scoring/frameworks';
import type { DimensionId } from '@/lib/scoring/frameworks';

type ViewMode = 'officer' | 'vendor';

export function CompliancePreviewToggle() {
  const [mode, setMode] = useState<ViewMode>('officer');

  const fw = FRAMEWORKS.soc2;
  const dimensionScores = Object.fromEntries(PREVIEW_SCORES.map(s => [s.dimension, s.score ?? 0])) as Partial<Record<DimensionId, number>>;
  const compositeScore = computeCompositeScore(dimensionScores, fw.weights);
  const avgConfidence = PREVIEW_SCORES.reduce((sum, s) => sum + (s.confidence ?? 0), 0) / PREVIEW_SCORES.length;

  const answerMap = new Map(PREVIEW_ANSWERS.map(a => [a.question_id, a]));
  const openGaps = PREVIEW_GAPS.filter(g => g.status === 'open');

  return (
    <div className="flex flex-col gap-6">
      {/* Role toggle */}
      <div className="flex items-center gap-3 p-1 bg-slate-100 rounded-lg w-fit">
        {(['officer', 'vendor'] as ViewMode[]).map(v => (
          <button
            key={v}
            onClick={() => setMode(v)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              mode === v
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {v === 'officer' ? '🏢 View as Compliance Officer' : '📋 View as Vendor'}
          </button>
        ))}
      </div>

      {mode === 'officer' ? <OfficerView compositeScore={compositeScore} avgConfidence={avgConfidence} answerMap={answerMap} openGaps={openGaps} /> : <VendorView answerMap={answerMap} />}
    </div>
  );
}

function OfficerView({ compositeScore, avgConfidence, answerMap, openGaps }: {
  compositeScore: number;
  avgConfidence: number;
  answerMap: Map<string, typeof PREVIEW_ANSWERS[0]>;
  openGaps: typeof PREVIEW_GAPS;
}) {
  const fw = FRAMEWORKS.soc2;

  return (
    <div className="flex flex-col gap-5">
      {/* Engagement header */}
      <div className="flex items-center gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Acme Analytics Inc.</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="framework" framework="soc2" />
            <Badge variant="status" status="info">In Review</Badge>
            <span className="text-xs text-slate-500">Due 2026-06-30</span>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Risk Score', value: Math.round(compositeScore).toString() },
          { label: 'Open Gaps', value: openGaps.length.toString() },
          { label: 'Questions Answered', value: `${PREVIEW_ANSWERS.length}/${PREVIEW_QUESTIONS.length}` },
          { label: 'Documents', value: PREVIEW_DOCUMENTS.length.toString() },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardBody className="py-3">
              <p className="text-xs text-slate-500">{kpi.label}</p>
              <p className="text-xl font-bold text-slate-900 tabular-nums">{kpi.value}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Risk score */}
      <Card>
        <CardHeader><h3 className="text-sm font-semibold text-slate-800">Risk Score — SOC 2</h3></CardHeader>
        <CardBody>
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-xs">
              <RiskMeter score={compositeScore} />
            </div>
            <div className="shrink-0">
              <ConfidenceBadge confidence={avgConfidence} />
            </div>
            <div className={`shrink-0 px-4 py-2 rounded-lg font-bold text-sm ${compositeScore >= 80 ? 'bg-green-600 text-white' : compositeScore >= 50 ? 'bg-amber-500 text-white' : 'bg-red-600 text-white'}`}>
              {PREVIEW_REPORT.decision.replace('_', ' ').toUpperCase()}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Gaps */}
      <Card>
        <CardHeader><h3 className="text-sm font-semibold text-slate-800">Compliance Gaps ({openGaps.length} open)</h3></CardHeader>
        <CardBody className="flex flex-col gap-3">
          {PREVIEW_GAPS.map(gap => (
            <div key={gap.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <Badge variant="status" status={gap.severity === 'high' ? 'risk' : 'warning'}>{gap.severity.toUpperCase()}</Badge>
              <div>
                <p className="text-sm font-medium text-slate-800">{gap.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{gap.control_category}</p>
              </div>
              <Badge variant="status" status={gap.status === 'open' ? 'risk' : 'warning'} className="ml-auto shrink-0">
                {gap.status.replace('_', ' ')}
              </Badge>
            </div>
          ))}
        </CardBody>
      </Card>

      {/* Evidence snippet sample */}
      <Card>
        <CardHeader><h3 className="text-sm font-semibold text-slate-800">Sample Evidence Extraction</h3></CardHeader>
        <CardBody className="flex flex-col gap-3">
          {PREVIEW_EVIDENCE_LINKS.slice(0, 2).map(link => (
            <EvidenceSnippet
              key={link.id}
              snippet={link.snippet_text ?? ''}
              documentName={PREVIEW_DOCUMENTS.find(d => d.id === link.document_id)?.file_name ?? 'Document'}
              pageNumber={link.page_number ?? undefined}
              strength={link.strength}
            />
          ))}
        </CardBody>
      </Card>
    </div>
  );
}

function VendorView({ answerMap }: { answerMap: Map<string, typeof PREVIEW_ANSWERS[0]> }) {
  const answered = PREVIEW_ANSWERS.filter(a => a.answer_status !== 'missing').length;
  const progress = Math.round((answered / PREVIEW_QUESTIONS.length) * 100);
  const openGaps = PREVIEW_GAPS.filter(g => g.status === 'open');

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-slate-900">Acme Analytics Inc.</h2>
        <p className="text-sm text-slate-500 mt-0.5">Your compliance profile — SOC 2 Vendor Review</p>
      </div>

      {/* Progress card */}
      <Card>
        <CardBody>
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0">
              <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E2E8F0" strokeWidth="3"/>
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#2563EB" strokeWidth="3"
                  strokeDasharray={`${progress} 100`} strokeLinecap="round"/>
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-900">{progress}%</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Questionnaire {progress}% complete</p>
              <p className="text-xs text-slate-500 mt-0.5">{answered} of {PREVIEW_QUESTIONS.length} questions answered</p>
              <p className="text-xs text-slate-500">{PREVIEW_DOCUMENTS.length} documents uploaded</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Open gaps from reviewer */}
      {openGaps.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-slate-800">Requested by Reviewer</h3>
            <Badge variant="status" status="risk">{openGaps.length} open</Badge>
          </CardHeader>
          <CardBody className="flex flex-col gap-3">
            {openGaps.map(gap => (
              <div key={gap.id} className="flex items-start justify-between gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                <div>
                  <p className="text-sm font-medium text-slate-800">{gap.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{gap.why_it_matters}</p>
                  {(gap.suggested_evidence ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {(gap.suggested_evidence ?? []).map(e => (
                        <span key={e} className="px-1.5 py-0.5 text-xs bg-blue-50 text-blue-600 rounded">{e.replace(/_/g, ' ')}</span>
                      ))}
                    </div>
                  )}
                </div>
                <button className="shrink-0 text-xs text-blue-600 hover:underline whitespace-nowrap">Upload →</button>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {/* Answer status summary */}
      <Card>
        <CardHeader><h3 className="text-sm font-semibold text-slate-800">Answer Status</h3></CardHeader>
        <CardBody>
          <div className="flex flex-col gap-2">
            {PREVIEW_QUESTIONS.slice(0, 5).map(q => {
              const answer = answerMap.get(q.id);
              const status = answer?.answer_status ?? 'missing';
              const statusColor = status === 'auto_filled' ? 'text-green-700' : status === 'partial' ? 'text-amber-700' : 'text-red-600';
              const statusLabel = status === 'auto_filled' ? 'Auto-filled' : status === 'partial' ? 'Partial' : 'Missing';
              return (
                <div key={q.id} className="flex items-center gap-2 text-sm">
                  <span className="font-mono text-xs text-slate-400 w-16 shrink-0">{q.control_id}</span>
                  <span className="flex-1 text-slate-700 truncate">{q.question_text}</span>
                  <span className={`text-xs font-medium shrink-0 ${statusColor}`}>{statusLabel}</span>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
