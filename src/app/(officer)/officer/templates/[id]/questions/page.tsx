import React from 'react';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Badge } from '@/design-system';
import Link from 'next/link';
import { QuestionLibraryClient } from '@/components/officer/QuestionLibraryClient';

interface PageProps { params: Promise<{ id: string }> }

export default async function TemplateQuestionsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: template } = await supabase
    .from('questionnaire_templates')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!template) notFound();

  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('template_id', template.template_key)
    .order('sort_order', { ascending: true });

  const categories = [...new Set((questions ?? []).map((q: { control_category: string }) => q.control_category))];

  return (
    <div className="max-w-screen-xl mx-auto space-y-6">
      <PageHeader
        title={template.label}
        subtitle={template.description ?? 'Custom questionnaire template'}
        breadcrumbs={[
          { label: 'Dashboard', href: '/officer/dashboard' },
          { label: 'Frameworks', href: '/officer/templates' },
          { label: template.label },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {template.is_custom && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-100 text-primary-700">
                Custom
              </span>
            )}
            {template.is_published === false && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-warning-100 text-warning-700">
                Draft
              </span>
            )}
          </div>
        }
      />

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Questions', value: questions?.length ?? 0,    color: 'text-gray-900' },
          { label: 'Categories',      value: categories.length,          color: 'text-primary-600' },
          { label: 'Required',        value: (questions ?? []).filter((q: { is_required: boolean }) => q.is_required).length, color: 'text-danger-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-lg shadow-xs p-5">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-3xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <QuestionLibraryClient
        templateId={id}
        templateKey={template.template_key}
        isCustom={template.is_custom ?? false}
        isPublished={template.is_published ?? true}
        initialQuestions={questions ?? []}
      />
    </div>
  );
}
