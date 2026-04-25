import React from 'react';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, CardBody } from '@/design-system';
import { getEngagement, getEngagementContext, listQuestions, listAnswers, listEvidenceLinks } from '@/lib/compliance/queries';
import { QuestionnaireTable } from '@/components/officer/QuestionnaireTable';
import { EngagementContextHeader } from '@/components/officer/EngagementContextHeader';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ filter?: string }>;
}

export default async function QuestionnairePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { filter } = await searchParams;
  const justExtracted = filter === 'extracted';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const engagement = await getEngagement(id);
  if (!engagement) notFound();

  const [questions, answers, evidenceLinks, context] = await Promise.all([
    listQuestions(engagement.template_id),
    listAnswers(id),
    listEvidenceLinks(id),
    getEngagementContext(engagement, user.id),
  ]);

  const answerMap = new Map(answers.map(a => [a.question_id, a]));
  const linkMap = new Map<string, typeof evidenceLinks>(
    answers.map(a => [a.id, evidenceLinks.filter(l => l.answer_id === a.id)])
  );

  const categories = [...new Set(questions.map(q => q.control_category))];

  const stats = {
    total: questions.length,
    answered: answers.filter(a => a.answer_status !== 'missing').length,
    autoFilled: answers.filter(a => a.answer_status === 'auto_filled').length,
    partial: answers.filter(a => a.answer_status === 'partial').length,
    missing: questions.length - answers.filter(a => a.answer_status !== 'missing').length,
  };

  const vendorLabel =
    engagement.vendor_company?.trim() ||
    engagement.vendor_email?.trim() ||
    engagement.vendor_user_id ||
    'Unassigned vendor';

  const extractedCount = stats.autoFilled + stats.partial;

  return (
    <div className="max-w-screen-xl mx-auto space-y-6">
      <EngagementContextHeader
        engagement={engagement}
        orgName={context.orgName}
        workflow={context.workflow}
        activeStepKey="extraction"
      />
      <PageHeader
        title="Questionnaire Review"
        subtitle={`${vendorLabel} — ${engagement.framework_id.toUpperCase()} — ${engagement.template_id}`}
        breadcrumbs={[
          { label: 'Engagements', href: '/officer/engagements' },
          { label: 'Workspace', href: `/officer/engagements/${id}` },
          { label: 'Questionnaire' },
        ]}
        actions={
          <a
            href={`/officer/engagements/${id}/questionnaire/export`}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            </svg>
            Export PDF
          </a>
        }
      />

      {/* Post-extraction banner */}
      {justExtracted && extractedCount > 0 && (
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-success-200 bg-success-50 px-4 py-3.5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-success-600 shrink-0 mt-0.5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-semibold text-success-800">
              AI extracted {extractedCount} answer{extractedCount !== 1 ? 's' : ''} from the uploaded document
            </p>
            <p className="text-xs text-success-700 mt-0.5">
              {stats.autoFilled} auto-filled with high confidence · {stats.partial} partial (need review) · {stats.missing} still missing.
              Expand any row to see the cited evidence snippet and confidence score.
            </p>
          </div>
          <a
            href={`/officer/engagements/${id}/questionnaire`}
            className="text-xs text-success-700 hover:text-success-900 font-medium whitespace-nowrap"
          >
            Show all →
          </a>
        </div>
      )}

      {/* Post-extraction banner when nothing was filled */}
      {justExtracted && extractedCount === 0 && (
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-warning-200 bg-warning-50 px-4 py-3.5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-warning-600 shrink-0 mt-0.5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-semibold text-warning-800">No answers were extracted from this document</p>
            <p className="text-xs text-warning-700 mt-0.5">
              The document may not contain content that matches this engagement&apos;s framework questions.
              Try uploading a document that matches the <strong>{engagement.framework_id.toUpperCase()}</strong> framework
              (e.g. a SOC 2 report, policy document, or vendor questionnaire response).
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Questions', value: stats.total,      color: 'text-gray-900' },
          { label: 'Auto-Filled',     value: stats.autoFilled, color: 'text-success-700' },
          { label: 'Partial',         value: stats.partial,    color: 'text-warning-700' },
          { label: 'Missing',         value: stats.missing,    color: 'text-danger-700' },
        ].map(s => (
          <Card key={s.label}>
            <CardBody className="py-3">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className={`text-xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      {categories.map(category => {
        const catQuestions = questions.filter(q => q.control_category === category);
        // When arriving from extraction, skip categories with no answers at all
        const catAnsweredCount = catQuestions.filter(q => {
          const s = answerMap.get(q.id)?.answer_status;
          return s === 'auto_filled' || s === 'partial' || s === 'manual';
        }).length;
        if (justExtracted && catAnsweredCount === 0) return null;

        return (
          <Card key={category} className="mb-4">
            <CardBody className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-800">{category}</h2>
                  <p className="text-xs text-gray-500">{catQuestions.length} questions</p>
                </div>
                {justExtracted && (
                  <span className="text-xs font-semibold text-success-700 bg-success-50 px-2 py-0.5 rounded-full">
                    {catAnsweredCount} extracted
                  </span>
                )}
              </div>
            </CardBody>
            <CardBody className="p-0">
              <QuestionnaireTable
                questions={catQuestions}
                answerMap={Object.fromEntries(answerMap)}
                linkMap={Object.fromEntries(linkMap)}
                engagementId={id}
                autoExpandExtracted={justExtracted}
              />
            </CardBody>
          </Card>
        );
      })}

      {justExtracted && extractedCount === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">
          No answers were populated. All {stats.total} questions are still missing.
        </div>
      )}
    </div>
  );
}
