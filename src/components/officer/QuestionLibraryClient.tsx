'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';

const CATEGORIES = ['Security', 'Security Controls', 'Data Privacy', 'Financial', 'Financial Risk', 'Operations', 'Operational Resilience', 'Governance', 'Access Controls', 'Change Management', 'IT General Controls', 'Segregation of Duties', 'Financial Reporting', 'Availability', 'Confidentiality', 'Contractual', 'Data Handling'];
const EVIDENCE_TYPES = ['policy_document', 'audit_report', 'certificate', 'penetration_test', 'financial_statement', 'soc2_report', 'iso_certificate', 'contract', 'screenshot', 'procedure_document', 'risk_assessment', 'business_continuity_plan'];

interface Question {
  id: string;
  template_id: string;
  control_category: string;
  control_id: string | null;
  question_text: string;
  expected_evidence_types: string[] | null;
  weight: number;
  is_required: boolean;
  sort_order: number;
  created_at: string;
}

interface Props {
  templateId: string;
  templateKey: string;
  isCustom: boolean;
  isPublished: boolean;
  initialQuestions: Question[];
}

interface AddFormState {
  question_text: string;
  control_category: string;
  control_id: string;
  expected_evidence_types: string[];
  is_required: boolean;
  weight: string;
}

const EMPTY_FORM: AddFormState = {
  question_text: '',
  control_category: 'Security',
  control_id: '',
  expected_evidence_types: [],
  is_required: true,
  weight: '1.0',
};

export function QuestionLibraryClient({ templateId, isCustom, isPublished, initialQuestions }: Props) {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<AddFormState>(EMPTY_FORM);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [filterCat, setFilterCat] = useState('');

  // ── Import state ────────────────────────────────────────────────────
  const [importOpen, setImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<Array<{
    question_text: string;
    control_category: string;
    control_id?: string;
    expected_evidence_types?: string;
    weight?: number;
    is_required?: boolean;
  }>>([]);
  const [importReplace, setImportReplace] = useState(false);
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Inline edit state ───────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ question_text: string; weight: string; is_required: boolean }>({ question_text: '', weight: '1.0', is_required: true });
  const [savingEdit, setSavingEdit] = useState(false);

  const usedCategories = [...new Set(questions.map(q => q.control_category))];
  const displayedQuestions = filterCat
    ? questions.filter(q => q.control_category === filterCat)
    : questions;

  const groupedByCategory = usedCategories.reduce<Record<string, Question[]>>((acc, cat) => {
    acc[cat] = displayedQuestions.filter(q => q.control_category === cat);
    return acc;
  }, {});

  const handleAdd = async () => {
    if (!form.question_text.trim()) { setAddError('Question text is required.'); return; }
    setAdding(true);
    setAddError('');
    try {
      const res = await fetch(`/api/compliance/templates/${templateId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_text: form.question_text.trim(),
          control_category: form.control_category,
          control_id: form.control_id.trim() || undefined,
          expected_evidence_types: form.expected_evidence_types,
          is_required: form.is_required,
          weight: parseFloat(form.weight) || 1.0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to add question');
      setQuestions(prev => [...prev, data.question]);
      setForm(EMPTY_FORM);
      setShowAddForm(false);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (questionId: string) => {
    setDeletingId(questionId);
    try {
      const res = await fetch(`/api/compliance/templates/${templateId}/questions`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: questionId }),
      });
      if (!res.ok) return;
      setQuestions(prev => prev.filter(q => q.id !== questionId));
    } finally {
      setDeletingId(null);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const res = await fetch(`/api/compliance/templates/${templateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? 'Failed to publish template');
        return;
      }
      router.refresh();
    } finally {
      setPublishing(false);
    }
  };

  // ── Import handlers ─────────────────────────────────────────────────
  const handleFile = async (file: File) => {
    setImportError('');
    setImportPreview([]);
    try {
      const name = file.name.toLowerCase();
      let rows: Record<string, unknown>[] = [];
      if (name.endsWith('.json')) {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) throw new Error('JSON must be an array of question objects.');
        rows = parsed;
      } else {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const sheetName = wb.SheetNames[0];
        if (!sheetName) throw new Error('File has no sheets.');
        rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName], { defval: '' });
      }
      if (rows.length === 0) throw new Error('No rows found in file.');

      const parsed = rows.map((raw, i) => {
        const lower: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(raw)) {
          lower[k.trim().toLowerCase().replace(/\s+/g, '_')] = v;
        }
        const questionText = String(lower.question_text ?? lower.question ?? lower.prompt ?? lower.text ?? '').trim();
        const controlCategory = String(lower.control_category ?? lower.category ?? lower.dimension ?? lower.section ?? '').trim();
        if (!questionText) throw new Error(`Row ${i + 2}: missing question_text`);
        if (!controlCategory) throw new Error(`Row ${i + 2}: missing control_category`);
        const evidenceRaw = lower.expected_evidence_types ?? lower.evidence ?? lower.expected_evidence ?? '';
        const evidence = Array.isArray(evidenceRaw) ? evidenceRaw.join(', ') : String(evidenceRaw ?? '');
        const weight = Number(lower.weight ?? 1) || 1;
        const requiredRaw = lower.is_required ?? lower.required ?? lower.mandatory ?? true;
        const isRequired = typeof requiredRaw === 'boolean'
          ? requiredRaw
          : /^(true|yes|y|1)$/i.test(String(requiredRaw ?? '').trim());
        return {
          question_text: questionText,
          control_category: controlCategory,
          control_id: String(lower.control_id ?? lower.control ?? '').trim() || undefined,
          expected_evidence_types: evidence,
          weight,
          is_required: isRequired,
        };
      });
      setImportPreview(parsed);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to parse file.');
    }
  };

  const submitImport = async () => {
    if (importPreview.length === 0) return;
    setImporting(true);
    setImportError('');
    try {
      const payload = {
        replace: importReplace,
        questions: importPreview.map(r => ({
          question_text: r.question_text,
          control_category: r.control_category,
          control_id: r.control_id || undefined,
          expected_evidence_types: (r.expected_evidence_types ?? '').split(/[,;|]/).map(s => s.trim()).filter(Boolean),
          weight: r.weight ?? 1,
          is_required: r.is_required ?? true,
        })),
      };
      const res = await fetch(`/api/compliance/templates/${templateId}/questions/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data.details && data.details.join('; ')) || data.error || 'Import failed');
      // Reload from server to reflect replace/append semantics correctly
      router.refresh();
      setImportOpen(false);
      setImportPreview([]);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setImporting(false);
    }
  };

  // ── Inline edit handlers ────────────────────────────────────────────
  const startEdit = (q: Question) => {
    setEditingId(q.id);
    setEditDraft({
      question_text: q.question_text,
      weight: String(q.weight),
      is_required: q.is_required,
    });
  };

  const saveEdit = async (q: Question) => {
    if (!editDraft.question_text.trim()) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/compliance/templates/${templateId}/questions/${q.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_text: editDraft.question_text.trim(),
          weight: parseFloat(editDraft.weight) || 1.0,
          is_required: editDraft.is_required,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to update');
      setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, ...data.question } : x));
      setEditingId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleEvidenceType = (type: string) => {
    setForm(prev => ({
      ...prev,
      expected_evidence_types: prev.expected_evidence_types.includes(type)
        ? prev.expected_evidence_types.filter(t => t !== type)
        : [...prev.expected_evidence_types, type],
    }));
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {isCustom && !isPublished && (
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing || questions.length === 0}
            className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-semibold rounded-md bg-success-600 text-white hover:bg-success-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {publishing ? 'Publishing…' : 'Publish template'}
          </button>
        )}
        {isCustom && (
          <button
            type="button"
            onClick={() => { setShowAddForm(v => !v); setAddError(''); }}
            className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-semibold rounded-md bg-primary-500 text-white hover:bg-primary-600 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
            </svg>
            Add question
          </button>
        )}

        {isCustom && (
          <button
            type="button"
            onClick={() => { setImportOpen(true); setImportError(''); }}
            className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-semibold rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"/>
            </svg>
            Import CSV / XLSX / JSON
          </button>
        )}

        {/* Category filter */}
        {usedCategories.length > 1 && (
          <div className="ml-auto">
            <select
              value={filterCat}
              onChange={e => setFilterCat(e.target.value)}
              className="h-9 rounded-md border border-gray-200 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All categories</option>
              {usedCategories.map(cat => (
                <option key={cat} value={cat}>{cat} ({questions.filter(q => q.control_category === cat).length})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Add question form */}
      {showAddForm && (
        <div className="bg-white border-2 border-primary-200 rounded-xl p-5 space-y-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-900">New question</p>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Question text <span className="text-danger-500">*</span>
            </label>
            <textarea
              value={form.question_text}
              onChange={e => { setForm(p => ({ ...p, question_text: e.target.value })); setAddError(''); }}
              rows={3}
              placeholder="e.g. Does your organization have a formal incident response plan?"
              className="block w-full rounded-md border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Category <span className="text-danger-500">*</span>
              </label>
              <select
                value={form.control_category}
                onChange={e => setForm(p => ({ ...p, control_category: e.target.value }))}
                className="block w-full rounded-md border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Control ID <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={form.control_id}
                onChange={e => setForm(p => ({ ...p, control_id: e.target.value }))}
                placeholder="e.g. CC6.1, SOX-AC-01"
                className="block w-full rounded-md border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2">Expected evidence types</p>
            <div className="flex flex-wrap gap-1.5">
              {EVIDENCE_TYPES.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleEvidenceType(type)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                    form.expected_evidence_types.includes(type)
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                  )}
                >
                  {type.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Weight</label>
              <input
                type="number"
                min="0.1"
                max="2.0"
                step="0.05"
                value={form.weight}
                onChange={e => setForm(p => ({ ...p, weight: e.target.value }))}
                className="block w-full rounded-md border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-[11px] text-gray-400 mt-1">1.0 = normal, 1.25+ = critical, 0.8 = low priority</p>
            </div>
            <div className="flex items-center gap-3 pt-5">
              <input
                id="is-required"
                type="checkbox"
                checked={form.is_required}
                onChange={e => setForm(p => ({ ...p, is_required: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="is-required" className="text-sm text-gray-700 font-medium cursor-pointer">
                Required question
              </label>
            </div>
          </div>

          {addError && (
            <div className="rounded-md bg-danger-50 border border-danger-200 px-3 py-2 text-xs text-danger-700">
              {addError}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding || !form.question_text.trim()}
              className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-semibold rounded-md bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {adding ? 'Adding…' : 'Add question'}
            </button>
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setForm(EMPTY_FORM); setAddError(''); }}
              className="h-9 px-4 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Question list grouped by category */}
      {questions.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg shadow-xs py-16 text-center">
          <div className="h-12 w-12 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary-500" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"/>
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-800 mb-1">No questions yet</p>
          {isCustom ? (
            <p className="text-xs text-gray-500 mb-3">Add your first question using the button above.</p>
          ) : (
            <p className="text-xs text-gray-500">This is a system template — questions are seeded and read-only.</p>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {usedCategories.map(category => {
            const catQuestions = (filterCat ? displayedQuestions : questions).filter(q => q.control_category === category);
            if (catQuestions.length === 0) return null;
            return (
              <div key={category} className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">{category}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{catQuestions.length} question{catQuestions.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="divide-y divide-gray-50">
                  {catQuestions.map((q, idx) => (
                    <div key={q.id} className="px-5 py-4 flex items-start gap-4 group hover:bg-gray-50 transition-colors">
                      {/* Sequence number */}
                      <span className="shrink-0 h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-500 mt-0.5">
                        {idx + 1}
                      </span>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {q.control_id && (
                            <span className="font-mono text-xs text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">{q.control_id}</span>
                          )}
                          {q.is_required && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-danger-50 text-danger-600">Required</span>
                          )}
                          <span className="text-[10px] text-gray-400 font-mono">weight {q.weight}</span>
                        </div>
                        {editingId === q.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={editDraft.question_text}
                              onChange={e => setEditDraft(p => ({ ...p, question_text: e.target.value }))}
                              rows={2}
                              className="block w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                            <div className="flex items-center gap-3 flex-wrap">
                              <label className="text-xs text-gray-600 flex items-center gap-1.5">
                                Weight
                                <input
                                  type="number"
                                  min="0"
                                  step="0.05"
                                  value={editDraft.weight}
                                  onChange={e => setEditDraft(p => ({ ...p, weight: e.target.value }))}
                                  className="w-20 rounded-md border border-gray-200 px-2 py-1 text-sm"
                                />
                              </label>
                              <label className="text-xs text-gray-600 flex items-center gap-1.5">
                                <input
                                  type="checkbox"
                                  checked={editDraft.is_required}
                                  onChange={e => setEditDraft(p => ({ ...p, is_required: e.target.checked }))}
                                />
                                Required
                              </label>
                              <div className="ml-auto flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => saveEdit(q)}
                                  disabled={savingEdit || !editDraft.question_text.trim()}
                                  className="h-8 px-3 text-xs font-semibold rounded-md bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50"
                                >
                                  {savingEdit ? 'Saving…' : 'Save'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  className="h-8 px-3 text-xs font-semibold rounded-md text-gray-600 hover:bg-gray-100"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-800 leading-relaxed">{q.question_text}</p>
                        )}
                        {editingId !== q.id && (q.expected_evidence_types ?? []).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {(q.expected_evidence_types ?? []).map(t => (
                              <span key={t} className="px-2 py-0.5 text-xs bg-primary-50 text-primary-600 rounded-full font-medium">
                                {t.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions (custom templates only) */}
                      {isCustom && editingId !== q.id && (
                        <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => startEdit(q)}
                            title="Edit question"
                            className="h-7 w-7 flex items-center justify-center rounded-md text-gray-400 hover:text-primary-600 hover:bg-primary-50"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"/>
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(q.id)}
                            disabled={deletingId === q.id}
                            title="Delete question"
                            className="h-7 w-7 flex items-center justify-center rounded-md text-gray-300 hover:text-danger-500 hover:bg-danger-50 disabled:opacity-40"
                          >
                            {deletingId === q.id ? (
                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/>
                              </svg>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Publish callout for draft custom templates */}
      {isCustom && !isPublished && questions.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg bg-warning-50 border border-warning-200 px-4 py-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-warning-600 shrink-0 mt-0.5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"/>
          </svg>
          <div className="flex-1">
            <p className="text-sm font-semibold text-warning-800">This template is a draft</p>
            <p className="text-xs text-warning-700 mt-0.5">It won't be available for new engagements until you publish it. Use the "Publish template" button above when ready.</p>
          </div>
        </div>
      )}

      {/* Import modal */}
      {importOpen && (
        <div className="fixed inset-0 bg-gray-900/40 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Import questions</h3>
              <button
                onClick={() => { setImportOpen(false); setImportPreview([]); setImportError(''); }}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
                aria-label="Close"
              >✕</button>
            </div>
            <div className="px-5 py-4 space-y-4 overflow-auto">
              <p className="text-xs text-gray-500">
                Upload a <strong>CSV</strong>, <strong>XLSX</strong>, or <strong>JSON</strong> file.
                Required columns: <code className="bg-gray-100 px-1 rounded">question_text</code>, <code className="bg-gray-100 px-1 rounded">control_category</code>.
                Optional: <code className="bg-gray-100 px-1 rounded">control_id</code>, <code className="bg-gray-100 px-1 rounded">expected_evidence_types</code> (comma-separated), <code className="bg-gray-100 px-1 rounded">weight</code>, <code className="bg-gray-100 px-1 rounded">is_required</code>.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls,.json,text/csv,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={e => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
                className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
              />

              {importError && <p className="text-sm text-danger-600">{importError}</p>}

              {importPreview.length > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      Parsed <strong>{importPreview.length}</strong> row{importPreview.length === 1 ? '' : 's'}.
                    </p>
                    <label className="flex items-center gap-2 text-xs text-gray-700">
                      <input
                        type="checkbox"
                        checked={importReplace}
                        onChange={e => setImportReplace(e.target.checked)}
                      />
                      Replace all existing questions
                    </label>
                  </div>
                  <div className="border border-gray-200 rounded-md overflow-auto max-h-80">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          {['#', 'Question', 'Category', 'Control', 'Evidence', 'Wt', 'Req'].map(h => (
                            <th key={h} className="px-2 py-1.5 text-left font-semibold text-gray-500">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {importPreview.slice(0, 50).map((r, i) => (
                          <tr key={i}>
                            <td className="px-2 py-1 text-gray-400">{i + 1}</td>
                            <td className="px-2 py-1 max-w-sm truncate" title={r.question_text}>{r.question_text}</td>
                            <td className="px-2 py-1">{r.control_category}</td>
                            <td className="px-2 py-1">{r.control_id || '—'}</td>
                            <td className="px-2 py-1 max-w-xs truncate" title={String(r.expected_evidence_types)}>{r.expected_evidence_types || '—'}</td>
                            <td className="px-2 py-1">{r.weight ?? 1}</td>
                            <td className="px-2 py-1">{String(r.is_required)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importPreview.length > 50 && (
                      <p className="px-2 py-1 text-[11px] text-gray-400 bg-gray-50">+ {importPreview.length - 50} more rows (not shown in preview)</p>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-end gap-2 bg-gray-50">
              <button
                type="button"
                onClick={() => { setImportOpen(false); setImportPreview([]); setImportError(''); }}
                className="h-9 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitImport}
                disabled={importing || importPreview.length === 0}
                className={cn(
                  'h-9 px-4 text-sm font-semibold rounded-md bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50',
                )}
              >
                {importing ? 'Importing…' : `Import ${importPreview.length} question${importPreview.length === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
