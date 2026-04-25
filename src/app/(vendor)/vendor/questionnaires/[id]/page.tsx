import React from 'react';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/design-system';
import { getEngagement, listQuestions, listAnswers, listDocuments } from '@/lib/compliance/queries';
import { FRAMEWORKS } from '@/lib/scoring/frameworks';
import { VendorQuestionnaire } from '@/components/vendor/VendorQuestionnaire';

interface PageProps { params: Promise<{ id: string }> }

export default async function VendorQuestionnairePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const engagement = await getEngagement(id);
  if (!engagement) notFound();
  if (engagement.vendor_user_id !== user.id) redirect('/vendor/dashboard');

  const [questions, answers, documents] = await Promise.all([
    listQuestions(engagement.template_id),
    listAnswers(id),
    listDocuments(id),
  ]);

  const fw = FRAMEWORKS[engagement.framework_id as keyof typeof FRAMEWORKS];

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title={fw?.label ?? 'Questionnaire'}
        subtitle="Complete each section and upload supporting evidence"
        breadcrumbs={[
          { label: 'Dashboard', href: '/vendor/dashboard' },
          { label: 'Questionnaire' },
        ]}
      />
      <VendorQuestionnaire
        engagementId={id}
        questions={questions}
        initialAnswers={answers}
        documents={documents}
      />
    </div>
  );
}
