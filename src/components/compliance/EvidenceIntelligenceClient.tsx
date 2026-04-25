'use client';

import React, { useMemo, useState } from 'react';
import { Search, ExternalLink, MessageSquare, Filter as FilterIcon, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  EvidenceIntelligenceData,
  EvidenceQuestionRow,
  EvidenceDocumentRow,
  EvidenceOutcome,
} from '@/lib/compliance/queries';

interface Props {
  vendorLabel: string;
  data: EvidenceIntelligenceData;
}

type View = 'questions' | 'documents';
type OutcomeFilter = 'all' | EvidenceOutcome;

// ── Style helpers ────────────────────────────────────────────────────────────

const OUTCOME_LABEL: Record<EvidenceOutcome, string> = {
  yes: 'Yes',
  partial: 'Partial',
  no: 'No',
  missing: 'Missing',
};

const OUTCOME_BADGE: Record<EvidenceOutcome, string> = {
  yes: 'bg-success-50 text-success-700 ring-1 ring-success-200',
  partial: 'bg-warning-50 text-warning-700 ring-1 ring-warning-200',
  no: 'bg-danger-50 text-danger-700 ring-1 ring-danger-200',
  missing: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
};

const OUTCOME_DOT: Record<EvidenceOutcome, string> = {
  yes: 'bg-success-500',
  partial: 'bg-warning-500',
  no: 'bg-danger-500',
  missing: 'bg-gray-400',
};

const STRENGTH_BADGE: Record<'strong' | 'partial' | 'none', string> = {
  strong: 'bg-success-50 text-success-700',
  partial: 'bg-warning-50 text-warning-700',
  none: 'bg-gray-100 text-gray-500',
};

// ── Confidence ring (SVG) ────────────────────────────────────────────────────

function ConfidenceRing({ pct, size = 96 }: { pct: number | null; size?: number }) {
  const value = pct ?? 0;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  const color =
    pct == null
      ? '#9CA3AF'
      : value >= 80
        ? '#059669'
        : value >= 50
          ? '#D97706'
          : '#DC2626';
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#E5E7EB" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${dash} ${circ - dash}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 300ms ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums" style={{ color }}>
          {pct == null ? '—' : `${value}%`}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-gray-400">Confidence</span>
      </div>
    </div>
  );
}

// ── KPI strip ────────────────────────────────────────────────────────────────

function Kpi({
  label,
  value,
  sub,
  valueColor,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-xs flex flex-col gap-1">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
      <p className="text-3xl font-bold tabular-nums leading-none" style={{ color: valueColor }}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function EvidenceIntelligenceClient({ vendorLabel, data }: Props) {
  const [view, setView] = useState<View>('questions');
  const [search, setSearch] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    data.questions[0]?.questionId ?? null,
  );
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    data.documents[0]?.documentId ?? null,
  );

  const filteredQuestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.questions.filter(row => {
      if (outcomeFilter !== 'all' && row.outcome !== outcomeFilter) return false;
      if (categoryFilter !== 'all' && row.controlCategory !== categoryFilter) return false;
      if (q && !row.questionText.toLowerCase().includes(q) && !(row.controlId ?? '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data.questions, search, outcomeFilter, categoryFilter]);

  const selectedQuestion = useMemo(
    () => data.questions.find(r => r.questionId === selectedQuestionId) ?? filteredQuestions[0] ?? null,
    [data.questions, selectedQuestionId, filteredQuestions],
  );

  const filteredDocuments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.documents.filter(d => !q || d.fileName.toLowerCase().includes(q));
  }, [data.documents, search]);

  const selectedDocument = useMemo(
    () => data.documents.find(d => d.documentId === selectedDocumentId) ?? filteredDocuments[0] ?? null,
    [data.documents, selectedDocumentId, filteredDocuments],
  );

  // Documents that map to the selected document's supported question IDs
  const questionsForSelectedDoc = useMemo(() => {
    if (!selectedDocument) return [];
    const ids = new Set(selectedDocument.supportedQuestionIds);
    return data.questions.filter(q => ids.has(q.questionId));
  }, [selectedDocument, data.questions]);

  const totals = data.totals;

  return (
    <div className="space-y-5">
      {/* ── KPI bar ─────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi
          label="Overall Coverage"
          value={`${totals.coveragePct}%`}
          sub={`${totals.answeredQuestions} of ${totals.totalQuestions} questions mapped`}
          valueColor={totals.coveragePct >= 70 ? '#059669' : totals.coveragePct >= 40 ? '#D97706' : '#DC2626'}
        />
        <Kpi
          label="Strong Evidence"
          value={totals.strongCount}
          sub={totals.totalQuestions > 0 ? `${Math.round((totals.strongCount / totals.totalQuestions) * 100)}% of total` : '—'}
          valueColor="#059669"
        />
        <Kpi
          label="Partial Evidence"
          value={totals.partialCount}
          sub={totals.totalQuestions > 0 ? `${Math.round((totals.partialCount / totals.totalQuestions) * 100)}% of total` : '—'}
          valueColor="#D97706"
        />
        <Kpi
          label="Missing Evidence"
          value={totals.missingCount}
          sub={totals.totalQuestions > 0 ? `${Math.round((totals.missingCount / totals.totalQuestions) * 100)}% of total` : '—'}
          valueColor="#DC2626"
        />
        <Kpi
          label="Average Confidence"
          value={totals.averageConfidence == null ? '—' : `${totals.averageConfidence}%`}
          sub={totals.averageConfidence == null ? 'No answers yet' : totals.averageConfidence >= 80 ? 'High' : totals.averageConfidence >= 50 ? 'Medium' : 'Low'}
          valueColor={totals.averageConfidence == null ? '#9CA3AF' : totals.averageConfidence >= 80 ? '#059669' : totals.averageConfidence >= 50 ? '#D97706' : '#DC2626'}
        />
      </div>

      {/* ── View toggle + search ────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-xs p-3 flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="View" className="inline-flex bg-gray-100 rounded-md p-0.5">
          {(['questions', 'documents'] as View[]).map(v => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={cn(
                'px-3 py-1.5 text-sm font-semibold rounded transition-colors',
                view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {v === 'questions' ? 'Questions' : 'Documents'}
            </button>
          ))}
        </div>

        {view === 'questions' && (
          <>
            <div className="hidden md:flex items-center gap-2 text-xs text-gray-500 ml-2">
              {(['yes', 'partial', 'missing'] as EvidenceOutcome[]).map(k => (
                <span key={k} className="inline-flex items-center gap-1.5">
                  <span className={cn('h-2 w-2 rounded-full', OUTCOME_DOT[k])} />
                  {OUTCOME_LABEL[k]}
                </span>
              ))}
            </div>
            {data.categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="ml-auto md:ml-0 text-sm border border-gray-200 rounded-md px-2.5 py-1.5 text-gray-700 bg-white"
              >
                <option value="all">All categories</option>
                {data.categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            <select
              value={outcomeFilter}
              onChange={e => setOutcomeFilter(e.target.value as OutcomeFilter)}
              className="text-sm border border-gray-200 rounded-md px-2.5 py-1.5 text-gray-700 bg-white"
            >
              <option value="all">All outcomes</option>
              <option value="yes">Yes</option>
              <option value="partial">Partial</option>
              <option value="no">No</option>
              <option value="missing">Missing</option>
            </select>
          </>
        )}

        <div className="ml-auto relative w-full md:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={view === 'questions' ? 'Search questions…' : 'Search documents…'}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300"
          />
        </div>
      </div>

      {/* ── Two-panel body ───────────────────────────── */}
      {view === 'questions' ? (
        <QuestionsView
          rows={filteredQuestions}
          selected={selectedQuestion}
          onSelect={id => setSelectedQuestionId(id)}
          vendorLabel={vendorLabel}
        />
      ) : (
        <DocumentsView
          rows={filteredDocuments}
          selected={selectedDocument}
          onSelect={id => setSelectedDocumentId(id)}
          questions={questionsForSelectedDoc}
          totalCategories={data.categories}
        />
      )}
    </div>
  );
}

// ── Questions view ───────────────────────────────────────────────────────────

function QuestionsView({
  rows,
  selected,
  onSelect,
  vendorLabel,
}: {
  rows: EvidenceQuestionRow[];
  selected: EvidenceQuestionRow | null;
  onSelect: (id: string) => void;
  vendorLabel: string;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,_5fr)_minmax(0,_7fr)] gap-5">
      {/* Left list */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 grid grid-cols-[1fr_auto_auto] gap-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          <span>Question</span>
          <span>Status</span>
          <span>Confidence</span>
        </div>
        {rows.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">
            No questions match the current filters.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 max-h-[640px] overflow-y-auto">
            {rows.map(row => {
              const isSelected = selected?.questionId === row.questionId;
              return (
                <li key={row.questionId}>
                  <button
                    type="button"
                    onClick={() => onSelect(row.questionId)}
                    className={cn(
                      'w-full text-left px-4 py-3 grid grid-cols-[1fr_auto_auto] gap-3 items-center transition-colors',
                      isSelected ? 'bg-primary-50/60 ring-1 ring-inset ring-primary-300' : 'hover:bg-gray-50',
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-gray-900 leading-snug truncate">{row.questionText}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                        {row.controlId ?? '—'} · {row.controlCategory}
                      </p>
                    </div>
                    <span className={cn('inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full', OUTCOME_BADGE[row.outcome])}>
                      {OUTCOME_LABEL[row.outcome]}
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-gray-700 min-w-[3rem] text-right">
                      {row.confidencePct == null ? '—' : `${row.confidencePct}%`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Right detail */}
      {selected ? (
        <QuestionDetail row={selected} vendorLabel={vendorLabel} />
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg shadow-xs p-12 text-center text-sm text-gray-500">
          Select a question to see its evidence and confidence rationale.
        </div>
      )}
    </div>
  );
}

function QuestionDetail({ row, vendorLabel }: { row: EvidenceQuestionRow; vendorLabel: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-xs flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={cn('inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full', OUTCOME_BADGE[row.outcome])}>
              {OUTCOME_LABEL[row.outcome]}
            </span>
            <span className="text-[11px] text-gray-400 font-mono">{row.controlId ?? row.questionId.slice(0, 8)}</span>
            <span className="text-[11px] text-gray-400">· {row.controlCategory}</span>
          </div>
          <h3 className="text-base font-semibold text-gray-900 leading-snug">{row.questionText}</h3>
        </div>
        <ConfidenceRing pct={row.confidencePct} size={84} />
      </div>

      {/* Answer */}
      <div className="px-5 py-4 border-b border-gray-100">
        <p className="text-[11px] uppercase tracking-wider font-semibold text-gray-500 mb-1.5">AI-extracted answer</p>
        {row.outcome === 'missing' ? (
          <p className="text-sm text-gray-500 italic">No answer recorded — evidence has not been linked yet.</p>
        ) : (
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
            {row.answerText ?? 'Answer text not available.'}
          </p>
        )}
      </div>

      {/* Confidence drivers */}
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/60">
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-sm font-semibold text-gray-900">Why this confidence?</p>
          <p className="text-xs text-gray-500">Drivers inferred from linked evidence</p>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed mb-3">{row.drivers.rationale}</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <DriverPill label="Sources" value={String(row.drivers.supportingSourceCount)} />
          <DriverPill label="Best strength" value={row.drivers.bestStrength === 'none' ? '—' : row.drivers.bestStrength} accent={row.drivers.bestStrength} />
          <DriverPill label="Consistency" value={row.drivers.consistency === 'none' ? '—' : row.drivers.consistency.replace('-', ' ')} />
          <DriverPill label="Conflicts" value={row.drivers.conflictsFound ? 'Yes' : 'No'} accent={row.drivers.conflictsFound ? 'partial' : 'strong'} />
          <DriverPill label="Specificity" value={row.drivers.specificity} />
        </div>
        {row.matchedConcepts.length > 0 && (
          <div className="mt-4">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-gray-500 mb-1.5">What was matched</p>
            <div className="flex flex-wrap gap-1.5">
              {row.matchedConcepts.map(c => (
                <span key={c} className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-md bg-primary-50 text-primary-700 ring-1 ring-primary-100">
                  {c.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sources */}
      <div className="px-5 py-4 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-900 mb-3">
          Supporting evidence <span className="text-gray-400 font-normal">({row.sources.length})</span>
        </p>
        {row.sources.length === 0 ? (
          <div className="text-sm text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-md px-4 py-6 text-center">
            No evidence linked. Upload a document to this engagement so the AI can match supporting language.
          </div>
        ) : (
          <ul className="space-y-2.5">
            {row.sources.map((src, idx) => (
              <li key={`${src.documentId}-${idx}`} className="border border-gray-200 rounded-md p-3 bg-white hover:border-gray-300 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center shrink-0 text-[10px] font-bold uppercase text-gray-600">
                    {(src.fileType ?? 'doc').slice(0, 3)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 truncate">{src.documentName}</p>
                      {src.pageNumber != null && (
                        <span className="text-[11px] text-gray-500">p. {src.pageNumber}</span>
                      )}
                      <span className={cn('inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded uppercase tracking-wider', STRENGTH_BADGE[src.strength])}>
                        {src.strength}
                      </span>
                      <span className="text-[11px] text-gray-500 ml-auto">Relevance {src.relevancePct}%</span>
                    </div>
                    {src.snippet && (
                      <blockquote className="mt-2 text-xs text-gray-700 leading-relaxed border-l-2 border-gray-200 pl-3 italic">
                        “{src.snippet.length > 280 ? src.snippet.slice(0, 280) + '…' : src.snippet}”
                      </blockquote>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
                      >
                        <ExternalLink size={12} /> Open in context
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
        <span>
          Answer generated{' '}
          {row.generatedAt
            ? new Date(row.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : '—'}
        </span>
        <span className="text-gray-300">·</span>
        <span>Model: {row.extractionSource ?? 'Kaptrix AI'}</span>
        <span className="text-gray-300">·</span>
        <span>Evidence cutoff: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        <button type="button" className="ml-auto inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium">
          <MessageSquare size={12} /> Provide feedback
        </button>
      </div>
      <div className="px-5 pb-4 text-[11px] text-gray-400">Engagement: {vendorLabel}</div>
    </div>
  );
}

function DriverPill({ label, value, accent }: { label: string; value: string; accent?: 'strong' | 'partial' | 'none' }) {
  const tone =
    accent === 'strong'
      ? 'text-success-700 bg-success-50 ring-success-100'
      : accent === 'partial'
        ? 'text-warning-700 bg-warning-50 ring-warning-100'
        : accent === 'none'
          ? 'text-danger-700 bg-danger-50 ring-danger-100'
          : 'text-gray-700 bg-white ring-gray-200';
  return (
    <div className={cn('rounded-md px-2.5 py-1.5 ring-1', tone)}>
      <p className="text-[10px] uppercase tracking-wider font-semibold opacity-70">{label}</p>
      <p className="text-xs font-semibold capitalize">{value}</p>
    </div>
  );
}

// ── Documents view ──────────────────────────────────────────────────────────

function DocumentsView({
  rows,
  selected,
  onSelect,
  questions,
  totalCategories,
}: {
  rows: EvidenceDocumentRow[];
  selected: EvidenceDocumentRow | null;
  onSelect: (id: string) => void;
  questions: EvidenceQuestionRow[];
  totalCategories: string[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,_5fr)_minmax(0,_7fr)] gap-5">
      {/* Left list */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 grid grid-cols-[1fr_auto_auto] gap-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          <span>Document</span>
          <span>Supports</span>
          <span>Avg conf.</span>
        </div>
        {rows.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">No documents uploaded yet.</div>
        ) : (
          <ul className="divide-y divide-gray-100 max-h-[640px] overflow-y-auto">
            {rows.map(d => {
              const isSelected = selected?.documentId === d.documentId;
              return (
                <li key={d.documentId}>
                  <button
                    type="button"
                    onClick={() => onSelect(d.documentId)}
                    className={cn(
                      'w-full text-left px-4 py-3 grid grid-cols-[1fr_auto_auto] gap-3 items-center transition-colors',
                      isSelected ? 'bg-primary-50/60 ring-1 ring-inset ring-primary-300' : 'hover:bg-gray-50',
                    )}
                  >
                    <div className="min-w-0 flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded bg-gray-100 flex items-center justify-center shrink-0 text-[10px] font-bold uppercase text-gray-600">
                        {(d.fileType ?? 'doc').slice(0, 3)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{d.fileName}</p>
                        <p className="text-[11px] text-gray-400 truncate">
                          {d.pageCount ? `${d.pageCount} pages · ` : ''}
                          Uploaded {new Date(d.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-700 tabular-nums">{d.questionsSupported}</span>
                    <span className="text-sm font-semibold tabular-nums text-gray-700 min-w-[3rem] text-right">
                      {d.avgConfidence == null ? '—' : `${d.avgConfidence}%`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Right detail */}
      {selected ? (
        <DocumentDetail doc={selected} questions={questions} totalCategories={totalCategories} />
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg shadow-xs p-12 text-center text-sm text-gray-500">
          Select a document to see what it supports.
        </div>
      )}
    </div>
  );
}

function DocumentDetail({
  doc,
  questions,
  totalCategories,
}: {
  doc: EvidenceDocumentRow;
  questions: EvidenceQuestionRow[];
  totalCategories: string[];
}) {
  const uncovered = doc.uncoveredCategories;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-xs flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-start gap-3">
        <div className="h-10 w-10 rounded bg-primary-50 flex items-center justify-center shrink-0 text-xs font-bold uppercase text-primary-700">
          {(doc.fileType ?? 'doc').slice(0, 3)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 leading-snug">{doc.fileName}</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {doc.pageCount ? `${doc.pageCount} pages · ` : ''}
            Parsed {new Date(doc.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ·
            Status: {doc.extractionStatus}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 py-4 grid grid-cols-2 md:grid-cols-4 gap-3 border-b border-gray-100">
        <Kpi label="Questions supported" value={doc.questionsSupported} />
        <Kpi label="Strong matches" value={doc.strongCount} valueColor="#059669" />
        <Kpi label="Partial matches" value={doc.partialCount} valueColor="#D97706" />
        <Kpi
          label="Avg confidence"
          value={doc.avgConfidence == null ? '—' : `${doc.avgConfidence}%`}
          valueColor={doc.avgConfidence == null ? '#9CA3AF' : doc.avgConfidence >= 80 ? '#059669' : doc.avgConfidence >= 50 ? '#D97706' : '#DC2626'}
        />
      </div>

      {/* Concept tags */}
      {doc.evidenceTypes.length > 0 && (
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-gray-500 mb-1.5">Concepts detected</p>
          <div className="flex flex-wrap gap-1.5">
            {doc.evidenceTypes.map(t => (
              <span key={t} className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-md bg-gray-100 text-gray-700">
                {t.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Supported questions */}
      <div className="px-5 py-4 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-900 mb-3">
          Questions this document supports <span className="text-gray-400 font-normal">({questions.length})</span>
        </p>
        {questions.length === 0 ? (
          <p className="text-sm text-gray-500">No mapped questions yet — the AI hasn&apos;t linked this doc to any answer.</p>
        ) : (
          <ul className="divide-y divide-gray-100 border border-gray-200 rounded-md overflow-hidden">
            {questions.map(q => (
              <li key={q.questionId} className="px-3 py-2.5 flex items-center gap-3 hover:bg-gray-50">
                <span className={cn('h-2 w-2 rounded-full shrink-0', OUTCOME_DOT[q.outcome])} aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{q.questionText}</p>
                  <p className="text-[11px] text-gray-400">{q.controlId ?? '—'} · {q.controlCategory}</p>
                </div>
                <span className={cn('inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded uppercase', STRENGTH_BADGE[q.bestStrength])}>
                  {q.bestStrength}
                </span>
                <span className="text-xs font-semibold tabular-nums text-gray-700 w-10 text-right">
                  {q.confidencePct == null ? '—' : `${q.confidencePct}%`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Uncovered domains */}
      <div className="px-5 py-4">
        <p className="text-[11px] uppercase tracking-wider font-semibold text-gray-500 mb-2">
          Dimensions not covered by this document
        </p>
        {uncovered.length === 0 ? (
          <p className="text-sm text-gray-500">This document touches every dimension in the framework.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {uncovered.map(c => (
              <span key={c} className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-md bg-danger-50 text-danger-700 ring-1 ring-danger-100">
                {c}
              </span>
            ))}
            <span className="text-[11px] text-gray-400 self-center">
              {uncovered.length} of {totalCategories.length}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page-level header buttons (exported for reuse) ──────────────────────────

export function HeaderActions() {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50"
      >
        <Download size={14} /> Export Summary
      </button>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50"
      >
        <FilterIcon size={14} /> Filters
      </button>
    </div>
  );
}

