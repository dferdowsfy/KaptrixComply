import React from 'react';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/design-system';
import { getEngagement, listQuestions, listAnswers, listEvidenceLinks, listDocuments } from '@/lib/compliance/queries';
import { cn } from '@/lib/utils';
import { ReviewActionBar } from '@/components/compliance/ReviewActionBar';

interface PageProps { params: Promise<{ id: string }> }

const STATUS_STYLES = {
  auto_filled: { label: 'Auto-filled',  bg: 'bg-info-50',    text: 'text-info-700',    border: 'border-info-200' },
  partial:     { label: 'Partial',      bg: 'bg-warning-50', text: 'text-warning-700', border: 'border-warning-200' },
  missing:     { label: 'Missing',      bg: 'bg-danger-50',  text: 'text-danger-700',  border: 'border-danger-200' },
  manual:      { label: 'Manual',       bg: 'bg-gray-50',    text: 'text-gray-700',    border: 'border-gray-200' },
};

const REVIEW_STYLES = {
  approved: { label: 'Approved', bg: 'bg-success-100', text: 'text-success-700' },
  rejected: { label: 'Rejected', bg: 'bg-danger-100',  text: 'text-danger-700' },
  edited:   { label: 'Edited',   bg: 'bg-warning-100', text: 'text-warning-700' },
};

export default async function ReviewPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const engagement = await getEngagement(id);
  if (!engagement) notFound();
  if (engagement.reviewer_user_id !== user.id) redirect('/officer/dashboard');

  const [questions, answers, evidenceLinks, documents] = await Promise.all([
    listQuestions(engagement.template_id),
    listAnswers(id),
    listEvidenceLinks(id),
    listDocuments(id),
  ]);

  const answerMap = new Map(answers.map(a => [a.question_id, a]));
  const linksByAnswer = new Map<string, typeof evidenceLinks>();
  for (const link of evidenceLinks) {
    const existing = linksByAnswer.get(link.answer_id) ?? [];
    existing.push(link);
    linksByAnswer.set(link.answer_id, existing);
  }
  const docMap = new Map(documents.map(d => [d.id, d]));

  // Only show answers that need review: auto_filled or partial, not yet reviewed
  const reviewableAnswers = answers.filter(a =>
    (a.answer_status === 'auto_filled' || a.answer_status === 'partial') &&
    !(a as unknown as { review_status: string | null }).review_status,
  );

  // Stats
  const totalExtracted = answers.filter(a => a.answer_status === 'auto_filled' || a.answer_status === 'partial').length;
  const reviewed = answers.filter(a => !!(a as unknown as { review_status: string | null }).review_status).length;
  const highConf = answers.filter(a => a.answer_status === 'auto_filled' && (a.confidence_score ?? 0) >= 0.85).length;
  const needsReview = reviewableAnswers.filter(a => (a.confidence_score ?? 0) < 0.85).length;

  return (
    <div className="max-w-screen-xl mx-auto space-y-6">
      <PageHeader
        title="AI Extraction Review"
        subtitle="Review auto-filled and partial answers before locking the assessment"
        breadcrumbs={[
          { label: 'Vendors', href: '/officer/vendors' },
          { label: 'Engagement', href: `/officer/engagements/${id}/questionnaire` },
          { label: 'Review' },
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Extracted',    value: totalExtracted, color: 'text-primary-500' },
          { label: 'High Conf.',   value: highConf,       color: 'text-success-600' },
          { label: 'Needs Review', value: needsReview,    color: 'text-warning-600' },
          { label: 'Reviewed',     value: reviewed,       color: 'text-gray-500' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-lg shadow-xs p-5">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={cn('text-3xl font-bold tabular-nums', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Review queue */}
      {reviewableAnswers.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg shadow-xs py-16 text-center">
          <div className="h-12 w-12 rounded-full bg-success-100 flex items-center justify-center mx-auto mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-success-600" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-900 mb-1">All answers reviewed</p>
          <p className="text-xs text-gray-400">No pending review items. You can proceed to scoring.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviewableAnswers.map(answer => {
            const question = questions.find(q => q.id === answer.question_id);
            if (!question) return null;
            const links = linksByAnswer.get(answer.id) ?? [];
            const ss = STATUS_STYLES[answer.answer_status] ?? STATUS_STYLES.partial;
            const confidence = answer.confidence_score ?? 0;
            const confidenceColor = confidence >= 0.85 ? 'text-success-600' : confidence >= 0.50 ? 'text-warning-600' : 'text-danger-600';
            const answerAny = answer as unknown as { review_status: string | null; reasoning: string | null; flags: string[] | null };

            return (
              <div
                key={answer.id}
                className={cn('bg-white border rounded-lg shadow-xs overflow-hidden', ss.border)}
              >
                {/* Question header */}
                <div className={cn('px-5 py-3 border-b', ss.bg)}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold', ss.bg, ss.text)}>
                          {ss.label}
                        </span>
                        {question.control_id && (
                          <span className="text-xs font-mono text-gray-400">{question.control_id}</span>
                        )}
                        <span className="text-xs text-gray-400">{question.control_category}</span>
                        {answerAny.review_status && (
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold', REVIEW_STYLES[answerAny.review_status as keyof typeof REVIEW_STYLES]?.bg, REVIEW_STYLES[answerAny.review_status as keyof typeof REVIEW_STYLES]?.text)}>
                            {REVIEW_STYLES[answerAny.review_status as keyof typeof REVIEW_STYLES]?.label}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-gray-900 mt-1">{question.question_text}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={cn('text-lg font-bold tabular-nums', confidenceColor)}>
                        {Math.round(confidence * 100)}%
                      </p>
                      <p className="text-xs text-gray-400">confidence</p>
                    </div>
                  </div>
                </div>

                {/* Answer + reasoning */}
                <div className="px-5 py-4 space-y-3">
                  {answer.answer_text && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Extracted Answer</p>
                      <p className="text-sm text-gray-800 leading-relaxed">{answer.answer_text}</p>
                    </div>
                  )}

                  {answerAny.reasoning && (
                    <div className="rounded-md bg-gray-50 border border-gray-100 px-3 py-2">
                      <p className="text-xs font-semibold text-gray-500 mb-0.5">Reasoning</p>
                      <p className="text-xs text-gray-600 leading-relaxed">{answerAny.reasoning}</p>
                    </div>
                  )}

                  {/* Flags */}
                  {answerAny.flags && answerAny.flags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {answerAny.flags.map((flag: string) => (
                        <span key={flag} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-warning-50 text-warning-700 rounded-full border border-warning-200">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l1.664 1.664M21 21l-1.5-1.5m-5.485-1.242L12 17.25 4.5 21V8.742m.164-4.078a2.15 2.15 0 0 1 1.743-1.342 48.507 48.507 0 0 1 11.186 0c1.1.128 1.907 1.077 1.907 2.185V19.5" />
                          </svg>
                          {flag.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Evidence snippets */}
                  {links.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Evidence</p>
                      <div className="space-y-2">
                        {links.slice(0, 3).map(link => {
                          const doc = link.document_id ? docMap.get(link.document_id) : null;
                          return (
                            <div key={link.id} className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
                              <div className="flex items-center gap-2 mb-1">
                                {doc && (
                                  <span className="text-xs font-medium text-gray-500">{doc.file_name}</span>
                                )}
                                {link.page_number && (
                                  <span className="text-xs text-gray-300">p.{link.page_number}</span>
                                )}
                                <span className={cn(
                                  'ml-auto text-xs font-semibold',
                                  link.strength === 'strong' ? 'text-success-600' : link.strength === 'partial' ? 'text-warning-600' : 'text-gray-400',
                                )}>
                                  {link.strength}
                                </span>
                              </div>
                              <blockquote className="text-xs text-gray-600 italic leading-relaxed line-clamp-3">
                                &ldquo;{link.snippet_text}&rdquo;
                              </blockquote>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Action bar (client component) */}
                  <ReviewActionBar
                    answerId={answer.id}
                    engagementId={id}
                    currentAnswer={answer.answer_text ?? ''}
                    reviewStatus={answerAny.review_status ?? null}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
