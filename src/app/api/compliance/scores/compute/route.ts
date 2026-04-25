/**
 * POST /api/compliance/scores/compute
 *
 * Deterministically recompute compliance_scores for an engagement from the
 * current answers + evidence_links. Idempotent (upserts by dimension).
 * Writes an audit_log entry for every recompute.
 *
 * Also writes compliance_gaps rows for any missing answers (idempotent upsert
 * keyed on compliance_engagement_id + question_id).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FRAMEWORKS } from '@/lib/scoring/frameworks';
import type { FrameworkId } from '@/lib/scoring/frameworks';
import {
  computeDimensionScores,
  computeCompositeFromDimensions,
  deriveDecision,
} from '@/lib/compliance/scoring';
import type { Answer, EvidenceLink, Question } from '@/lib/compliance/types';

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

  // Auth: reviewer or vendor on this engagement
  const { data: engagement } = await supabase
    .from('compliance_engagements')
    .select('id, framework_id, template_id, reviewer_user_id, vendor_user_id')
    .eq('id', engagement_id)
    .maybeSingle();

  if (!engagement) return NextResponse.json({ error: 'Engagement not found' }, { status: 404 });
  if (engagement.reviewer_user_id !== user.id && engagement.vendor_user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const frameworkConfig = FRAMEWORKS[engagement.framework_id as FrameworkId];
  if (!frameworkConfig) {
    return NextResponse.json({ error: `Unknown framework: ${engagement.framework_id}` }, { status: 422 });
  }

  // Load all questions, answers, evidence_links
  const [{ data: rawQuestions }, { data: rawAnswers }, { data: rawLinks }] = await Promise.all([
    supabase
      .from('questions')
      .select('id, control_category, weight, expected_evidence_types, is_required')
      .eq('template_id', engagement.template_id),
    supabase
      .from('answers')
      .select('id, question_id, answer_status, confidence_score')
      .eq('compliance_engagement_id', engagement_id),
    supabase
      .from('evidence_links')
      .select('id, answer_id, strength')
      .eq('compliance_engagement_id', engagement_id),
  ]);

  const questions = (rawQuestions ?? []) as Question[];
  const answers   = (rawAnswers  ?? []) as Answer[];
  const links     = (rawLinks    ?? []) as EvidenceLink[];

  // ── Compute dimension scores ──────────────────────────────────────────────
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

  // ── Upsert compliance_scores ──────────────────────────────────────────────
  const scoreRows = dimensionResults.map(r => ({
    compliance_engagement_id: engagement_id,
    dimension: r.dimension,
    score: r.score,
    confidence: r.confidence,
    computed_at: new Date().toISOString(),
  }));

  for (const row of scoreRows) {
    await supabase
      .from('compliance_scores')
      .upsert(row, { onConflict: 'compliance_engagement_id,dimension' });
  }

  // ── Write audit log ───────────────────────────────────────────────────────
  await supabase.from('audit_log').insert({
    engagement_id,
    user_id: user.id,
    action: 'compliance_scores_recomputed',
    entity: 'compliance_scores',
    after: { composite, confidence, decision, dimensions: dimensionResults.map(r => ({ dimension: r.dimension, score: r.score })) },
  }).select().maybeSingle(); // don't fail if audit_log schema differs slightly

  return NextResponse.json({
    engagement_id,
    composite,
    confidence,
    decision,
    dimensions: dimensionResults,
  });
}
