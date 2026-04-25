'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const FRAMEWORK_OPTIONS = [
  { id: 'soc2',               label: 'SOC 2',                       desc: 'Trust Services Criteria' },
  { id: 'vdd',                label: 'Vendor Due Diligence',         desc: 'Vendor risk questionnaire' },
  { id: 'financial_controls', label: 'Financial Controls',           desc: 'SOX / ICFR-style controls' },
  { id: 'agnostic',           label: 'Framework-Agnostic',           desc: 'No specific framework' },
];

export default function NewTemplatePage() {
  const router = useRouter();
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [frameworkId, setFrameworkId] = useState('agnostic');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!label.trim()) { setError('Template name is required.'); return; }
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/compliance/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label.trim(), description: description.trim() || undefined, framework_id: frameworkId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create template');
      router.push(`/officer/templates/${data.template.id}/questions`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setCreating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/officer/templates"
          className="h-8 w-8 rounded-md border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          aria-label="Back to templates"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5"/>
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">New Custom Framework</h1>
          <p className="text-sm text-gray-400">Create a reusable questionnaire template with your own questions.</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-xs p-6 space-y-5">
        {/* Name */}
        <div>
          <label htmlFor="template-label" className="block text-xs font-semibold text-gray-700 mb-1.5">
            Template name <span className="text-danger-500">*</span>
          </label>
          <input
            id="template-label"
            type="text"
            value={label}
            onChange={e => { setLabel(e.target.value); setError(''); }}
            placeholder="e.g. Acme Vendor Security Questionnaire"
            className="block w-full rounded-md border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            autoFocus
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="template-desc" className="block text-xs font-semibold text-gray-700 mb-1.5">
            Description <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="template-desc"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="Describe what this questionnaire is for and when to use it…"
            className="block w-full rounded-md border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Framework scoring alignment */}
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2">Scoring alignment</p>
          <p className="text-xs text-gray-400 mb-3">Questions in this template will be scored using the selected framework's dimension weights.</p>
          <div className="grid grid-cols-2 gap-2">
            {FRAMEWORK_OPTIONS.map(fw => (
              <button
                key={fw.id}
                type="button"
                onClick={() => setFrameworkId(fw.id)}
                aria-pressed={frameworkId === fw.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all',
                  frameworkId === fw.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                )}
              >
                <div className={cn(
                  'h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5',
                  frameworkId === fw.id ? 'border-primary-500 bg-primary-500' : 'border-gray-300',
                )}>
                  {frameworkId === fw.id && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 leading-tight">{fw.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-tight">{fw.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-danger-50 border border-danger-200 px-3 py-2 text-xs text-danger-700">
            {error}
          </div>
        )}
      </div>

      {/* Info callout */}
      <div className="flex items-start gap-3 rounded-lg bg-primary-50 border border-primary-100 px-4 py-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary-500 shrink-0 mt-0.5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"/>
        </svg>
        <p className="text-xs text-primary-700 leading-relaxed">
          After creating the template you'll be taken to the question editor where you can add, edit, and reorder questions. The template won't be available for new engagements until you publish it.
        </p>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating || !label.trim()}
          className={cn(
            'inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold rounded-md transition-colors',
            creating || !label.trim()
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-primary-500 text-white hover:bg-primary-600',
          )}
        >
          {creating ? 'Creating…' : 'Create template'}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
