'use client';
import React, { useState, useRef } from 'react';
import { Stepper, Card, CardBody, Textarea, Badge } from '@/design-system';
import type { Question, Answer, ComplianceDocument } from '@/lib/compliance/types';

interface VendorQuestionnaireProps {
  engagementId: string;
  questions: Question[];
  initialAnswers: Answer[];
  documents: ComplianceDocument[];
}

const CATEGORIES_ORDER = ['Financial', 'Financial Risk', 'Security', 'Security Controls', 'Data Privacy', 'Operations', 'Operational Resilience', 'Governance', 'Access Controls', 'Change Management', 'IT General Controls', 'Segregation of Duties', 'Financial Reporting', 'Availability', 'Confidentiality', 'Contractual', 'Data Handling'];

function dedupeCategories(questions: Question[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const cat of CATEGORIES_ORDER) {
    if (!seen.has(cat) && questions.some(q => q.control_category === cat)) {
      seen.add(cat);
      result.push(cat);
    }
  }
  for (const q of questions) {
    if (!seen.has(q.control_category)) {
      seen.add(q.control_category);
      result.push(q.control_category);
    }
  }
  return result;
}

interface UploadState {
  status: 'idle' | 'uploading' | 'done' | 'error';
  fileName?: string;
  error?: string;
}

function QuestionFileUpload({
  questionId,
  engagementId,
}: {
  questionId: string;
  engagementId: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<UploadState[]>([]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newUploads: UploadState[] = Array.from(files).map(f => ({ status: 'uploading', fileName: f.name }));
    setUploads(prev => [...prev, ...newUploads]);

    await Promise.all(
      Array.from(files).map(async (file, i) => {
        const offset = uploads.length + i;
        const formData = new FormData();
        formData.set('engagement_id', engagementId);
        formData.set('file', file);
        formData.set('question_ids', JSON.stringify([questionId]));
        try {
          const res = await fetch('/api/compliance/documents', { method: 'POST', body: formData });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? 'Upload failed');
          setUploads(prev => prev.map((u, idx) => idx === offset ? { ...u, status: 'done' } : u));
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Upload failed';
          setUploads(prev => prev.map((u, idx) => idx === offset ? { ...u, status: 'error', error: msg } : u));
        }
      })
    );
  };

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
        className="flex items-center justify-center gap-2 w-full rounded-lg border-2 border-dashed border-gray-200 hover:border-primary-300 hover:bg-primary-50/30 transition-colors py-3 cursor-pointer text-sm text-gray-500 hover:text-primary-600"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"/>
        </svg>
        Upload supporting evidence
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.xlsx,.pptx,.png,.jpg,.jpeg,.csv"
          multiple
          className="sr-only"
          aria-label="Upload supporting evidence"
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {uploads.length > 0 && (
        <div className="space-y-1">
          {uploads.map((u, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              {u.status === 'uploading' && (
                <svg className="animate-spin h-3.5 w-3.5 text-primary-500 shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {u.status === 'done' && (
                <svg className="h-3.5 w-3.5 text-success-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
              {u.status === 'error' && (
                <svg className="h-3.5 w-3.5 text-danger-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              )}
              <span className={u.status === 'error' ? 'text-danger-600' : 'text-gray-600'}>
                {u.fileName}
                {u.status === 'uploading' && ' — uploading…'}
                {u.status === 'done' && ' — uploaded'}
                {u.status === 'error' && ` — ${u.error}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function VendorQuestionnaire({ engagementId, questions, initialAnswers, documents }: VendorQuestionnaireProps) {
  const categories = dedupeCategories(questions);
  const [activeCategory, setActiveCategory] = useState(categories[0] ?? '');
  const [answers, setAnswers] = useState<Record<string, string>>(
    Object.fromEntries(initialAnswers.map(a => [a.question_id, a.answer_text ?? '']))
  );
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const categoryQuestions = questions.filter(q => q.control_category === activeCategory);
  const completedCategories = categories.filter(cat =>
    questions.filter(q => q.control_category === cat).every(q => answers[q.id]?.trim())
  );

  const steps = categories.map(cat => ({ key: cat, label: cat }));
  const activeIdx = categories.indexOf(activeCategory);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/compliance/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engagementId,
          answers: Object.entries(answers).map(([questionId, text]) => ({ questionId, text })),
        }),
      });
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Stepper */}
      <div className="overflow-x-auto">
        <Stepper
          steps={steps}
          activeKey={activeCategory}
          completedKeys={completedCategories}
        />
      </div>

      {/* Questions for active category */}
      <Card>
        <CardBody className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">{activeCategory}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{categoryQuestions.length} questions</p>
            </div>
            {savedAt && (
              <p className="text-xs text-gray-400">
                Saved {savedAt.toLocaleTimeString()}
              </p>
            )}
          </div>
        </CardBody>
        <CardBody>
          <div className="flex flex-col gap-8">
            {categoryQuestions.map(q => (
              <div key={q.id} className="flex flex-col gap-3">
                <div className="flex items-start gap-2">
                  {q.control_id && (
                    <span className="shrink-0 font-mono text-xs text-slate-400 mt-0.5 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5">{q.control_id}</span>
                  )}
                  <p className="text-sm text-slate-800 font-medium leading-relaxed">{q.question_text}</p>
                  {q.is_required && (
                    <span className="shrink-0 text-danger-500 text-xs mt-0.5" aria-label="required">*</span>
                  )}
                </div>

                {/* Expected evidence types */}
                {(q.expected_evidence_types ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1 items-center">
                    <span className="text-xs text-slate-400">Expected:</span>
                    {(q.expected_evidence_types ?? []).map(t => (
                      <span key={t} className="px-1.5 py-0.5 text-xs bg-primary-50 text-primary-600 rounded font-medium">{t.replace(/_/g, ' ')}</span>
                    ))}
                  </div>
                )}

                {/* Text response */}
                <Textarea
                  placeholder="Describe your controls, policies, or reference uploaded documents…"
                  value={answers[q.id] ?? ''}
                  onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  rows={3}
                />

                {/* File upload — wired to API */}
                <QuestionFileUpload questionId={q.id} engagementId={engagementId} />

                {/* Status indicator */}
                {answers[q.id]?.trim() && (
                  <div className="flex items-center gap-1.5 text-xs text-success-700">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                    </svg>
                    Response recorded
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={activeIdx === 0}
          onClick={() => setActiveCategory(categories[activeIdx - 1])}
          className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-medium rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ← Previous
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 h-9 px-4 text-sm font-medium rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save progress'}
        </button>

        {activeIdx < categories.length - 1 ? (
          <button
            type="button"
            onClick={() => {
              void handleSave();
              setActiveCategory(categories[activeIdx + 1]);
            }}
            className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-medium rounded-md bg-primary-500 text-white hover:bg-primary-600 transition-colors"
          >
            Next →
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-medium rounded-md bg-success-600 text-white hover:bg-success-700 transition-colors"
          >
            Submit ✓
          </button>
        )}
      </div>
    </div>
  );
}
