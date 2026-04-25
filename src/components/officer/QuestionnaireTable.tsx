'use client';
import React, { useState, useMemo } from 'react';
import { Badge, ConfidenceBadge, EvidenceSnippet } from '@/design-system';
import type { Question, Answer, EvidenceLink } from '@/lib/compliance/types';

interface QuestionnaireTableProps {
  questions: Question[];
  answerMap: Record<string, Answer>;
  linkMap: Record<string, EvidenceLink[]>;
  engagementId: string;
  /** When true, auto-expand all rows that were auto-filled or partial */
  autoExpandExtracted?: boolean;
}

const statusConfig = {
  auto_filled: { label: 'Auto-filled', badge: 'success' as const },
  partial:     { label: 'Partial',     badge: 'warning' as const },
  missing:     { label: 'Missing',     badge: 'risk' as const },
  manual:      { label: 'Manual',      badge: 'info' as const },
};

const STATUS_ORDER: Record<string, number> = { auto_filled: 0, partial: 1, manual: 2, missing: 3 };

export function QuestionnaireTable({ questions, answerMap, linkMap, engagementId, autoExpandExtracted }: QuestionnaireTableProps) {
  const initialExpanded = useMemo(() => {
    if (!autoExpandExtracted) return new Set<string>();
    return new Set(
      questions
        .filter(q => answerMap[q.id]?.answer_status === 'auto_filled' || answerMap[q.id]?.answer_status === 'partial')
        .map(q => q.id)
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [expanded, setExpanded] = useState<Set<string>>(initialExpanded);
  const [showAll, setShowAll] = useState(false);

  const toggle = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const sorted = [...questions].sort((a, b) => {
    const sa = STATUS_ORDER[answerMap[a.id]?.answer_status ?? 'missing'] ?? 3;
    const sb = STATUS_ORDER[answerMap[b.id]?.answer_status ?? 'missing'] ?? 3;
    return sa - sb;
  });

  const answeredCount = questions.filter(q => {
    const s = answerMap[q.id]?.answer_status;
    return s === 'auto_filled' || s === 'partial' || s === 'manual';
  }).length;

  const visible = showAll ? sorted : sorted.filter(q => {
    const s = answerMap[q.id]?.answer_status;
    return s === 'auto_filled' || s === 'partial' || s === 'manual';
  });

  return (
    <div>
      {!showAll && answeredCount < questions.length && (
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs text-slate-500">
          <span>Showing {answeredCount} answered of {questions.length} total questions</span>
          <button
            onClick={() => setShowAll(true)}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Show all {questions.length} questions →
          </button>
        </div>
      )}
      {showAll && (
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs text-slate-500">
          <span>Showing all {questions.length} questions</span>
          <button
            onClick={() => setShowAll(false)}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Show answered only
          </button>
        </div>
      )}
    <table className="w-full text-sm">
      <thead className="bg-slate-50 border-b border-slate-100">
        <tr>
          <th className="w-8 px-2" />
          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wide w-24">ID</th>
          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">Question</th>
          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wide w-28">Status</th>
          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wide w-24">Confidence</th>
        </tr>
      </thead>
      <tbody>
        {visible.map(q => {
          const answer = answerMap[q.id];
          const links = answer ? (linkMap[answer.id] ?? []) : [];
          const status = answer?.answer_status ?? 'missing';
          const cfg = statusConfig[status] ?? statusConfig.missing;
          const isExpanded = expanded.has(q.id);

          return (
            <React.Fragment key={q.id}>
              <tr className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-2 py-2.5">
                  <button
                    className="text-slate-400 hover:text-slate-600 rounded focus-visible:ring-2 focus-visible:ring-blue-500"
                    onClick={() => toggle(q.id)}
                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    aria-expanded={isExpanded}
                  >
                    <svg className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                    </svg>
                  </button>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{q.control_id ?? q.id.slice(0, 8)}</td>
                <td className="px-4 py-2.5 text-slate-800">{q.question_text}</td>
                <td className="px-4 py-2.5">
                  <Badge variant="status" status={cfg.badge}>{cfg.label}</Badge>
                </td>
                <td className="px-4 py-2.5">
                  {answer?.confidence_score != null
                    ? <ConfidenceBadge confidence={answer.confidence_score} />
                    : <span className="text-xs text-slate-400">—</span>}
                </td>
              </tr>

              {isExpanded && (
                <tr className="bg-slate-50 border-b border-slate-100">
                  <td />
                  <td colSpan={4} className="px-4 py-4">
                    <div className="flex flex-col gap-3">
                      {/* Answer text */}
                      {answer?.answer_text ? (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 mb-1">Extracted Answer</p>
                          <p className="text-sm text-slate-700 bg-white rounded border border-slate-100 p-3">{answer.answer_text}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No answer extracted yet.</p>
                      )}

                      {/* Evidence snippets */}
                      {links.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 mb-2">Supporting Evidence</p>
                          <div className="flex flex-col gap-2">
                            {links.map(link => (
                              <EvidenceSnippet
                                key={link.id}
                                snippet={link.snippet_text ?? '(no snippet)'}
                                documentName={link.document_id ?? 'Document'}
                                pageNumber={link.page_number ?? undefined}
                                strength={link.strength}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Gap indicator */}
                      {status === 'missing' && (
                        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded">
                          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856C19.228 20 20 19.173 20 18.168V5.832C20 4.827 19.228 4 18.106 4H5.894C4.772 4 4 4.827 4 5.832v12.336C4 19.173 4.772 20 5.894 20z"/>
                          </svg>
                          No evidence submitted for this control. Consider flagging as a gap.
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          );
        })}
      </tbody>
    </table>
    </div>
  );
}
