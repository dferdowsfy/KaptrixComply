/**
 * POST /api/compliance/reports/generate
 *
 * Generates a compliance decision report for an engagement:
 *   1. Recompute scores (calls scoring engine directly — no extra HTTP round-trip)
 *   2. Derive decision (APPROVED / CONDITIONAL / HIGH RISK)
 *   3. Use LLM to produce evidence-backed justification text (temperature 0.3)
 *   4. Persist result to compliance_reports (upsert by engagement)
 *   5. Write audit_log entry
 *
 * Every top_risks and top_strengths cite specific gap/answer IDs so claims are
 * traceable. The LLM writes prose; all structural decisions come from the engine.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServiceClient } from '@/lib/supabase/service';
import { FRAMEWORKS } from '@/lib/scoring/frameworks';
import type { FrameworkId } from '@/lib/scoring/frameworks';
import {
  computeDimensionScores,
  computeCompositeFromDimensions,
  deriveDecision,
} from '@/lib/compliance/scoring';
import { openRouterChat, getOpenRouterModel } from '@/lib/llm/openrouter';
import type { Answer, EvidenceLink, Question, ComplianceGap } from '@/lib/compliance/types';

interface RequestBody {
  engagement_id: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { engagement_id } = body;
  if (!engagement_id) return NextResponse.json({ error: 'Missing engagement_id' }, { status: 400 });

  const { data: engagement } = await supabase
    .from('compliance_engagements')
    .select('id, framework_id, template_id, reviewer_user_id, vendor_user_id, vendor_company, vendor_email')
    .eq('id', engagement_id)
    .maybeSingle();

  if (!engagement) return NextResponse.json({ error: 'Engagement not found' }, { status: 404 });
  if (engagement.reviewer_user_id !== user.id) {
    return NextResponse.json({ error: 'Only the reviewing officer can generate reports' }, { status: 403 });
  }

  const frameworkConfig = FRAMEWORKS[engagement.framework_id as FrameworkId];
  if (!frameworkConfig) {
    return NextResponse.json({ error: `Unknown framework: ${engagement.framework_id}` }, { status: 422 });
  }

  // Use service client for DB writes: RLS on compliance_reports / audit_log
  // only grants inserts to the service_role. Reads stay on the user client
  // (already authorised above).
  const svc = getServiceClient() ?? supabase;

  // ── Load data ─────────────────────────────────────────────────────────────
  const [
    { data: rawQuestions },
    { data: rawAnswers },
    { data: rawLinks },
    { data: rawGaps },
  ] = await Promise.all([
    svc
      .from('questions')
      .select('id, control_id, control_category, question_text, expected_evidence_types, weight, is_required')
      .eq('template_id', engagement.template_id),
    svc
      .from('answers')
      .select('id, question_id, answer_status, confidence_score, answer_text')
      .eq('compliance_engagement_id', engagement_id),
    svc
      .from('evidence_links')
      .select('id, answer_id, document_id, snippet_text, strength')
      .eq('compliance_engagement_id', engagement_id),
    svc
      .from('compliance_gaps')
      .select('id, control_category, title, severity, status, why_it_matters')
      .eq('compliance_engagement_id', engagement_id)
      .eq('status', 'open')
      .order('severity', { ascending: false }),
  ]);

  const questions = (rawQuestions ?? []) as Question[];
  const answers   = (rawAnswers  ?? []) as Answer[];
  const links     = (rawLinks    ?? []) as EvidenceLink[];
  const openGaps  = (rawGaps     ?? []) as ComplianceGap[];

  // ── Recompute scores ──────────────────────────────────────────────────────
  const dimensionResults = computeDimensionScores({
    answers,
    evidenceLinks: links,
    questions,
    weights: frameworkConfig.weights,
  });

  const { composite, confidence } = computeCompositeFromDimensions(
    dimensionResults,
    frameworkConfig.weights,
  );

  const decision = deriveDecision(composite, confidence, frameworkConfig.decision_thresholds);

  // ── Build top strengths: auto_filled answers with strong evidence ─────────
  const linksByAnswer = new Map<string, typeof links>();
  for (const l of links) {
    const arr = linksByAnswer.get(l.answer_id) ?? [];
    arr.push(l);
    linksByAnswer.set(l.answer_id, arr);
  }

  const answerByQuestion = new Map<string, Answer>(answers.map(a => [a.question_id, a]));

  const strengths = questions
    .map(q => {
      const a = answerByQuestion.get(q.id);
      if (!a || a.answer_status !== 'auto_filled') return null;
      const aLinks = linksByAnswer.get(a.id) ?? [];
      const strongLink = aLinks.find(l => l.strength === 'strong');
      if (!strongLink) return null;
      return {
        answer_id: a.id,
        title: q.question_text.length > 100 ? q.question_text.slice(0, 97) + '…' : q.question_text,
        document_id: strongLink.document_id,
        snippet: strongLink.snippet_text,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .slice(0, 5);

  // ── Build top risks: critical + high severity open gaps ───────────────────
  const topRisks = openGaps
    .filter(g => g.severity === 'critical' || g.severity === 'high')
    .slice(0, 5)
    .map(g => ({ gap_id: g.id, title: g.title, why_it_matters: g.why_it_matters }));

  // ── Gap summary by category ───────────────────────────────────────────────
  const gapByCat = new Map<string, number>();
  for (const g of openGaps) {
    gapByCat.set(g.control_category, (gapByCat.get(g.control_category) ?? 0) + 1);
  }
  const gapSummaryLines = [...gapByCat.entries()]
    .map(([cat, count]) => `${cat}: ${count} open gap${count > 1 ? 's' : ''}`)
    .join('; ');

  // ── LLM: produce the justification section ───────────────────────────────
  const vendorLabel = engagement.vendor_company ?? engagement.vendor_email ?? 'the vendor';
  const decisionLabel = decision === 'approved' ? 'APPROVED' :
    decision === 'conditional' ? 'CONDITIONAL' : 'HIGH RISK';

  const systemPrompt = `You are a compliance analyst writing an evidence-backed decision report section.
Write concisely and professionally. Reference only facts present in the data provided.
Never invent evidence. Never hallucinate document names. Format in plain paragraphs (no markdown headers).
Keep the entire justification under 300 words.`;

  const userPrompt = `Generate a 2-3 paragraph justification for this compliance decision report.

Vendor: ${vendorLabel}
Framework: ${frameworkConfig.label}
Decision: ${decisionLabel}
Composite Score: ${Math.round(composite)} / 100
Confidence: ${Math.round(confidence * 100)}%

Top Risks (${topRisks.length}):
${topRisks.map(r => `- ${r.title}${r.why_it_matters ? ` (${r.why_it_matters})` : ''}`).join('\n') || 'None identified'}

Top Strengths (${strengths.length}):
${strengths.map(s => `- ${s.title}`).join('\n') || 'None identified'}

Gap Summary: ${gapSummaryLines || 'No open gaps'}

Write the justification. Do not add headers or bullet points.`;

  let justification = '';
  try {
    const model = getOpenRouterModel('report');
    const result = await openRouterChat({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      maxTokens: 500,
    });
    justification = result.content.trim();
  } catch (err) {
    console.error('[report/generate] LLM call failed:', err);
    justification = `Decision: ${decisionLabel}. Score: ${Math.round(composite)}/100. Confidence: ${Math.round(confidence * 100)}%.`;
  }

  // ── Persist report ────────────────────────────────────────────────────────
  const reportPayload = {
    compliance_engagement_id: engagement_id,
    decision,
    overall_score: composite,
    overall_confidence: confidence,
    top_risks: topRisks,
    top_strengths: strengths,
    gap_summary: gapSummaryLines || null,
    raw_content: justification,
    generated_by: user.id,
    generated_at: new Date().toISOString(),
  };

  // Delete previous report for this engagement then insert fresh
  await svc
    .from('compliance_reports')
    .delete()
    .eq('compliance_engagement_id', engagement_id);

  const { data: savedReport, error: insertError } = await svc
    .from('compliance_reports')
    .insert(reportPayload)
    .select('id')
    .single();

  if (insertError) {
    console.error('[report/generate] DB insert error:', insertError);
    return NextResponse.json({ error: 'Failed to save report' }, { status: 500 });
  }

  // ── Audit log ─────────────────────────────────────────────────────────────
  await svc.from('audit_log').insert({
    engagement_id,
    user_id: user.id,
    action: 'compliance_report_generated',
    entity: 'compliance_reports',
    after: { report_id: savedReport.id, decision, composite, confidence },
  }).maybeSingle();

  return NextResponse.json({
    report_id: savedReport.id,
    decision,
    composite,
    confidence,
    top_risks: topRisks,
    top_strengths: strengths,
    justification,
  });
}
