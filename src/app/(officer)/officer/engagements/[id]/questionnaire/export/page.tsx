import React from 'react';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  getEngagement,
  listQuestions,
  listAnswers,
  listEvidenceLinks,
  listDocuments,
} from '@/lib/compliance/queries';
import { PrintTrigger, PrintButton } from './PrintTrigger';

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_LABEL: Record<string, string> = {
  auto_filled: 'Auto-Filled',
  partial: 'Partial',
  manual: 'Manual',
  missing: 'Missing',
};

const STATUS_COLOR: Record<string, { bg: string; fg: string; border: string }> = {
  auto_filled: { bg: '#ecfdf5', fg: '#047857', border: '#a7f3d0' },
  partial:     { bg: '#fffbeb', fg: '#b45309', border: '#fde68a' },
  manual:      { bg: '#eff6ff', fg: '#1d4ed8', border: '#bfdbfe' },
  missing:     { bg: '#fef2f2', fg: '#b91c1c', border: '#fecaca' },
};

function confidenceLabel(c: number | null | undefined): string {
  if (c == null) return '—';
  if (c >= 0.75) return `${(c * 100).toFixed(0)}% (High)`;
  if (c >= 0.35) return `${(c * 100).toFixed(0)}% (Medium)`;
  return `${(c * 100).toFixed(0)}% (Low)`;
}

export default async function QuestionnaireExportPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const engagement = await getEngagement(id);
  if (!engagement) notFound();

  const [questions, answers, evidenceLinks, documents] = await Promise.all([
    listQuestions(engagement.template_id),
    listAnswers(id),
    listEvidenceLinks(id),
    listDocuments(id),
  ]);

  const answerMap = new Map(answers.map(a => [a.question_id, a]));
  const linksByAnswer = new Map<string, typeof evidenceLinks>();
  for (const l of evidenceLinks) {
    const arr = linksByAnswer.get(l.answer_id) ?? [];
    arr.push(l);
    linksByAnswer.set(l.answer_id, arr);
  }
  const docMap = new Map(documents.map(d => [d.id, d]));

  const categories = [...new Set(questions.map(q => q.control_category))];

  const stats = {
    total: questions.length,
    autoFilled: answers.filter(a => a.answer_status === 'auto_filled').length,
    partial:    answers.filter(a => a.answer_status === 'partial').length,
    manual:     answers.filter(a => a.answer_status === 'manual').length,
  };
  const answeredTotal = stats.autoFilled + stats.partial + stats.manual;
  const coverage = stats.total > 0 ? Math.round((answeredTotal / stats.total) * 100) : 0;

  const vendorLabel =
    engagement.vendor_company?.trim() ||
    engagement.vendor_email?.trim() ||
    engagement.vendor_user_id ||
    'Unassigned vendor';

  const generatedOn = new Date().toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const rationaleEntries = questions
    .map(q => {
      const a = answerMap.get(q.id);
      const reasoning = (a as unknown as { reasoning?: string | null } | undefined)?.reasoning ?? null;
      return { q, a, reasoning };
    })
    .filter(e => e.reasoning && e.reasoning.trim().length > 0);

  return (
    <>
      <PrintTrigger />
      <style>{`
        @page { size: Letter; margin: 0.6in 0.55in; }
        @media print {
          html, body { background: #fff !important; height: auto !important; overflow: visible !important; }
          /* Reset AppShell's flex/overflow constraints so content can span pages */
          body * { overflow: visible !important; max-height: none !important; }
          .h-screen { height: auto !important; }
          main { padding: 0 !important; height: auto !important; overflow: visible !important; }
          /* Hide app chrome (sidebar + topbar) in print */
          aside { display: none !important; }
          header { display: none !important; }
          .no-print { display: none !important; }
        }
        .kx-pdf-root { font-family: 'Geist', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #111827; background: #f9fafb; min-height: 100vh; padding: 32px 16px; }
        .kx-pdf-sheet { max-width: 820px; margin: 0 auto; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 10px 30px rgba(0,0,0,0.04); border-radius: 4px; }
        @media print { .kx-pdf-root { background: #fff; padding: 0; } .kx-pdf-sheet { box-shadow: none; border-radius: 0; max-width: none; } }
        .kx-cover { padding: 56px 56px 36px; border-bottom: 4px solid #0ea5e9; }
        .kx-cover .eyebrow { font-size: 10px; letter-spacing: 0.16em; font-weight: 700; color: #0369a1; text-transform: uppercase; }
        .kx-cover h1 { font-size: 30px; font-weight: 700; margin: 10px 0 4px; letter-spacing: -0.01em; }
        .kx-cover .sub { font-size: 13px; color: #4b5563; }
        .kx-meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px 32px; margin-top: 24px; font-size: 11px; }
        .kx-meta dt { font-size: 9px; letter-spacing: 0.12em; font-weight: 700; color: #6b7280; text-transform: uppercase; margin-bottom: 2px; }
        .kx-meta dd { font-size: 12px; color: #111827; margin: 0; font-weight: 500; }
        .kx-summary { padding: 28px 56px; border-bottom: 1px solid #e5e7eb; }
        .kx-summary h2 { font-size: 11px; letter-spacing: 0.14em; font-weight: 700; color: #374151; text-transform: uppercase; margin: 0 0 14px; }
        .kx-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .kx-kpi { border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px 14px; }
        .kx-kpi .n { font-size: 22px; font-weight: 700; line-height: 1; }
        .kx-kpi .l { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 6px; font-weight: 600; }
        .kx-bar { height: 6px; background: #e5e7eb; border-radius: 999px; margin-top: 18px; overflow: hidden; }
        .kx-bar > span { display: block; height: 100%; background: linear-gradient(90deg, #10b981, #0ea5e9); }
        .kx-section { padding: 28px 56px; }
        .kx-section + .kx-section { border-top: 1px solid #f3f4f6; }
        .kx-section h3 { font-size: 13px; font-weight: 700; color: #111827; margin: 0 0 4px; letter-spacing: -0.01em; }
        .kx-section .cat-sub { font-size: 11px; color: #6b7280; margin-bottom: 16px; }
        .kx-q { page-break-inside: avoid; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px 18px; margin-bottom: 12px; }
        .kx-q-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 10px; }
        .kx-q-title { font-size: 12.5px; font-weight: 600; color: #111827; line-height: 1.5; flex: 1; }
        .kx-q-ctrl { font-size: 9.5px; color: #6b7280; font-weight: 600; letter-spacing: 0.04em; margin-bottom: 3px; }
        .kx-chip { display: inline-flex; align-items: center; font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 999px; border-width: 1px; border-style: solid; letter-spacing: 0.04em; white-space: nowrap; text-transform: uppercase; }
        .kx-answer { font-size: 12px; color: #111827; line-height: 1.6; margin: 8px 0 0; }
        .kx-label { font-size: 9.5px; font-weight: 700; color: #6b7280; letter-spacing: 0.12em; text-transform: uppercase; margin-top: 12px; margin-bottom: 4px; }
        .kx-rationale { font-size: 11.5px; color: #374151; line-height: 1.55; background: #f9fafb; border-left: 3px solid #0ea5e9; padding: 10px 12px; border-radius: 0 4px 4px 0; }
        .kx-evidence { font-size: 11px; color: #374151; border-top: 1px dashed #e5e7eb; padding-top: 10px; margin-top: 12px; }
        .kx-evidence .src { font-size: 10px; color: #6b7280; margin-bottom: 4px; font-weight: 600; }
        .kx-evidence blockquote { margin: 0; padding: 8px 10px; background: #f8fafc; border-left: 2px solid #94a3b8; border-radius: 0 4px 4px 0; font-style: italic; color: #334155; font-size: 11px; line-height: 1.55; }
        .kx-confidence { display: flex; align-items: center; gap: 6px; margin-top: 6px; font-size: 10.5px; color: #4b5563; }
        .kx-meter { width: 60px; height: 4px; background: #e5e7eb; border-radius: 999px; overflow: hidden; }
        .kx-meter > span { display: block; height: 100%; }
        .kx-missing { font-size: 11px; color: #9ca3af; font-style: italic; }
        .kx-footer { padding: 20px 56px 40px; border-top: 1px solid #e5e7eb; font-size: 9.5px; color: #6b7280; display: flex; justify-content: space-between; }
        .kx-docs { list-style: none; padding: 0; margin: 0; font-size: 11px; }
        .kx-docs li { padding: 6px 0; border-bottom: 1px solid #f3f4f6; color: #374151; display: flex; justify-content: space-between; }
        .kx-docs li:last-child { border-bottom: 0; }
        .kx-page-break { page-break-before: always; break-before: page; }
        .kx-rationale-list { list-style: none; padding: 0; margin: 0; }
        .kx-rationale-list li { padding: 12px 0; border-bottom: 1px solid #f3f4f6; page-break-inside: avoid; }
        .kx-rationale-list li:last-child { border-bottom: 0; }
        .kx-rationale-list .rl-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 6px; }
        .kx-rationale-list .rl-ctrl { font-size: 9.5px; color: #6b7280; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 2px; }
        .kx-rationale-list .rl-q { font-size: 11.5px; font-weight: 600; color: #111827; line-height: 1.45; flex: 1; }
        .kx-rationale-list .rl-body { font-size: 11.5px; color: #374151; line-height: 1.55; background: #f9fafb; border-left: 3px solid #0ea5e9; padding: 10px 12px; border-radius: 0 4px 4px 0; }
        .kx-rationale-list .rl-conf { font-size: 10px; color: #6b7280; margin-top: 6px; font-weight: 500; }
        .kx-toolbar { position: sticky; top: 16px; z-index: 10; display: flex; justify-content: flex-end; gap: 8px; max-width: 820px; margin: 0 auto 14px; }
        .kx-toolbar button { border: 1px solid #0ea5e9; background: #0ea5e9; color: #fff; padding: 8px 14px; font-size: 12px; font-weight: 600; border-radius: 6px; cursor: pointer; }
        .kx-toolbar a { border: 1px solid #d1d5db; background: #fff; color: #374151; padding: 8px 14px; font-size: 12px; font-weight: 500; border-radius: 6px; text-decoration: none; }
      `}</style>

      <div className="kx-pdf-root">
        <div className="kx-toolbar no-print">
          <a href={`/officer/engagements/${id}/questionnaire`}>← Back</a>
          <PrintButton />
        </div>

        <div className="kx-pdf-sheet">
          <div className="kx-cover">
            <div className="eyebrow">Compliance Assessment Report</div>
            <h1>{vendorLabel}</h1>
            <div className="sub">{engagement.framework_id.toUpperCase()} — {engagement.template_id} — Questionnaire Review</div>
            <dl className="kx-meta">
              <div><dt>Framework</dt><dd>{engagement.framework_id.toUpperCase()}</dd></div>
              <div><dt>Template</dt><dd>{engagement.template_id}</dd></div>
              <div><dt>Engagement Status</dt><dd style={{ textTransform: 'capitalize' }}>{engagement.status.replace('_', ' ')}</dd></div>
              <div><dt>Engagement ID</dt><dd style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 10 }}>{engagement.id.slice(0, 13)}…</dd></div>
              <div><dt>Generated</dt><dd>{generatedOn}</dd></div>
              <div><dt>Coverage</dt><dd>{coverage}% of questions answered</dd></div>
            </dl>
          </div>

          <div className="kx-summary">
            <h2>Executive Summary</h2>
            <div className="kx-kpis">
              <div className="kx-kpi"><div className="n">{stats.total}</div><div className="l">Total Questions</div></div>
              <div className="kx-kpi"><div className="n" style={{ color: '#047857' }}>{stats.autoFilled}</div><div className="l">Auto-Filled</div></div>
              <div className="kx-kpi"><div className="n" style={{ color: '#b45309' }}>{stats.partial}</div><div className="l">Partial</div></div>
              <div className="kx-kpi"><div className="n" style={{ color: '#b91c1c' }}>{stats.total - answeredTotal}</div><div className="l">Missing</div></div>
            </div>
            <div className="kx-bar"><span style={{ width: `${coverage}%` }} /></div>
          </div>

          {rationaleEntries.length > 0 && (
            <div className="kx-section kx-page-break">
              <h3>AI Rationale &amp; Findings</h3>
              <div className="cat-sub">
                Determined reasoning for each answered control, based on extracted evidence.
              </div>
              <ul className="kx-rationale-list">
                {rationaleEntries.map(({ q, a, reasoning }) => {
                  const status = (a?.answer_status ?? 'missing') as keyof typeof STATUS_COLOR;
                  const color = STATUS_COLOR[status];
                  const c = a?.confidence_score ?? null;
                  return (
                    <li key={q.id}>
                      <div className="rl-head">
                        <div style={{ flex: 1 }}>
                          {q.control_id && <div className="rl-ctrl">{q.control_id} · {q.control_category}</div>}
                          <div className="rl-q">{q.question_text}</div>
                        </div>
                        <span
                          className="kx-chip"
                          style={{ background: color.bg, color: color.fg, borderColor: color.border }}
                        >
                          {STATUS_LABEL[status]}
                        </span>
                      </div>
                      <div className="rl-body">{reasoning}</div>
                      {c != null && (
                        <div className="rl-conf">Confidence: {confidenceLabel(c)}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {documents.length > 0 && (
            <div className="kx-section">
              <h3>Source Documents</h3>
              <div className="cat-sub">Evidence artifacts used during AI-assisted extraction.</div>
              <ul className="kx-docs">
                {documents.map(d => (
                  <li key={d.id}>
                    <span>{d.file_name}</span>
                    <span style={{ color: '#9ca3af' }}>{(d.file_type ?? '').toUpperCase()} · {d.extraction_status}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {categories.map(category => {
            const catQuestions = questions.filter(q => q.control_category === category);
            const catAnswered = catQuestions.filter(q => {
              const s = answerMap.get(q.id)?.answer_status;
              return s === 'auto_filled' || s === 'partial' || s === 'manual';
            }).length;

            return (
              <div className="kx-section" key={category}>
                <h3>{category}</h3>
                <div className="cat-sub">{catAnswered} of {catQuestions.length} answered</div>

                {catQuestions.map(q => {
                  const a = answerMap.get(q.id);
                  const status = (a?.answer_status ?? 'missing') as keyof typeof STATUS_COLOR;
                  const color = STATUS_COLOR[status];
                  // reasoning is persisted on the answer row but not in the TS type
                  const reasoning = (a as unknown as { reasoning?: string | null } | undefined)?.reasoning ?? null;
                  const links = a ? (linksByAnswer.get(a.id) ?? []) : [];
                  const c = a?.confidence_score ?? null;

                  return (
                    <div className="kx-q" key={q.id}>
                      <div className="kx-q-head">
                        <div style={{ flex: 1 }}>
                          {q.control_id && <div className="kx-q-ctrl">{q.control_id}</div>}
                          <div className="kx-q-title">{q.question_text}</div>
                        </div>
                        <span
                          className="kx-chip"
                          style={{ background: color.bg, color: color.fg, borderColor: color.border }}
                        >
                          {STATUS_LABEL[status]}
                        </span>
                      </div>

                      {a?.answer_text ? (
                        <>
                          <div className="kx-label">Answer</div>
                          <p className="kx-answer">{a.answer_text}</p>
                        </>
                      ) : (
                        <p className="kx-missing">No answer on file — evidence not yet identified for this control.</p>
                      )}

                      {reasoning && (
                        <>
                          <div className="kx-label">Rationale</div>
                          <div className="kx-rationale">{reasoning}</div>
                        </>
                      )}

                      {c != null && (
                        <div className="kx-confidence">
                          <span style={{ fontWeight: 600 }}>Confidence:</span>
                          <span>{confidenceLabel(c)}</span>
                          <div className="kx-meter">
                            <span style={{ width: `${Math.round(c * 100)}%`, background: c >= 0.75 ? '#10b981' : c >= 0.35 ? '#f59e0b' : '#ef4444' }} />
                          </div>
                        </div>
                      )}

                      {links.length > 0 && (
                        <div className="kx-evidence">
                          <div className="src">
                            Cited Evidence ({links.length})
                          </div>
                          {links.map(l => {
                            const doc = l.document_id ? docMap.get(l.document_id) : null;
                            return (
                              <div key={l.id} style={{ marginBottom: 8 }}>
                                <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 3 }}>
                                  {doc?.file_name ?? 'Document'}{l.page_number ? ` · page ${l.page_number}` : ''} · strength: {l.strength}
                                </div>
                                {l.snippet_text && <blockquote>“{l.snippet_text}”</blockquote>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          <div className="kx-footer">
            <div>Kaptrix · Compliance Assessment Report</div>
            <div>Confidential — for intended recipient only</div>
          </div>
        </div>
      </div>
    </>
  );
}

