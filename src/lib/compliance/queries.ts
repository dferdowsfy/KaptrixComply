import { createClient } from '@/lib/supabase/server';
import type {
  ComplianceEngagement,
  Answer,
  ComplianceDocument,
  EvidenceLink,
  ComplianceGap,
  RemediationAction,
  ComplianceScore,
  ComplianceReport,
  Question,
  UserRoleRecord,
} from './types';

export async function getUserRole(userId: string): Promise<UserRoleRecord | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return data;
}

export async function getEngagement(id: string): Promise<ComplianceEngagement | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('compliance_engagements')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return data;
}

export async function listOfficerEngagements(reviewerUserId: string): Promise<ComplianceEngagement[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('compliance_engagements')
    .select('*')
    .eq('reviewer_user_id', reviewerUserId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function listVendorEngagements(vendorUserId: string): Promise<ComplianceEngagement[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('compliance_engagements')
    .select('*')
    .eq('vendor_user_id', vendorUserId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function listQuestions(templateId: string): Promise<Question[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('questions')
    .select('*')
    .eq('template_id', templateId)
    .order('sort_order', { ascending: true });
  return data ?? [];
}

export async function listAnswers(engagementId: string): Promise<Answer[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('answers')
    .select('*')
    .eq('compliance_engagement_id', engagementId);
  return data ?? [];
}

export async function listDocuments(engagementId: string): Promise<ComplianceDocument[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('compliance_documents')
    .select('*')
    .eq('compliance_engagement_id', engagementId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function listEvidenceLinks(engagementId: string): Promise<EvidenceLink[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('evidence_links')
    .select('*')
    .eq('compliance_engagement_id', engagementId);
  return data ?? [];
}

export async function listGaps(engagementId: string): Promise<ComplianceGap[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('compliance_gaps')
    .select('*')
    .eq('compliance_engagement_id', engagementId)
    .order('severity', { ascending: false });
  return data ?? [];
}

export async function listRemediationActions(engagementId: string): Promise<RemediationAction[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('remediation_actions')
    .select('*')
    .eq('compliance_engagement_id', engagementId);
  return data ?? [];
}

export async function listScores(engagementId: string): Promise<ComplianceScore[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('compliance_scores')
    .select('*')
    .eq('compliance_engagement_id', engagementId);
  return data ?? [];
}

export async function getLatestReport(engagementId: string): Promise<ComplianceReport | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('compliance_reports')
    .select('*')
    .eq('compliance_engagement_id', engagementId)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export interface OfficerDashboardAggregates {
  totalEngagements: number;
  totalDocuments: number;
  totalQuestions: number;
  totalAnswered: number;
  highRiskGapCount: number;
  averageRiskScore: number | null;
  coverageByDomain: Array<{ category: string; answered: number; total: number; pct: number }>;
  topGaps: Array<{ title: string; count: number }>;
  progressByEngagement: Record<string, number>;
}

/**
 * Compute the aggregate metrics shown on the officer dashboard.
 * Returns zeros / empty arrays if the officer has no engagements yet.
 */
export async function getOfficerDashboardAggregates(
  reviewerUserId: string,
): Promise<OfficerDashboardAggregates> {
  const supabase = await createClient();

  const { data: engagementRows } = await supabase
    .from('compliance_engagements')
    .select('id, template_id')
    .eq('reviewer_user_id', reviewerUserId);

  const engagements = engagementRows ?? [];
  const engagementIds = engagements.map(e => e.id);
  const templateIds = [...new Set(engagements.map(e => e.template_id).filter(Boolean))];

  if (engagementIds.length === 0) {
    return {
      totalEngagements: 0,
      totalDocuments: 0,
      totalQuestions: 0,
      totalAnswered: 0,
      highRiskGapCount: 0,
      averageRiskScore: null,
      coverageByDomain: [],
      topGaps: [],
      progressByEngagement: {},
    };
  }

  const [
    { data: questionsRows },
    { data: answersRows },
    { data: gapsRows },
    { data: documentsRows },
    { data: reportsRows },
  ] = await Promise.all([
    templateIds.length > 0
      ? supabase
          .from('questions')
          .select('id, template_id, control_category')
          .in('template_id', templateIds)
      : Promise.resolve({ data: [] as Array<{ id: string; template_id: string; control_category: string }> }),
    supabase
      .from('answers')
      .select('question_id, answer_status, compliance_engagement_id')
      .in('compliance_engagement_id', engagementIds),
    supabase
      .from('compliance_gaps')
      .select('title, severity, status, control_category')
      .in('compliance_engagement_id', engagementIds),
    supabase
      .from('compliance_documents')
      .select('id')
      .in('compliance_engagement_id', engagementIds),
    supabase
      .from('compliance_reports')
      .select('compliance_engagement_id, overall_score, generated_at')
      .in('compliance_engagement_id', engagementIds)
      .order('generated_at', { ascending: false }),
  ]);

  const questions = (questionsRows ?? []) as Array<{ id: string; template_id: string; control_category: string }>;
  const answers = (answersRows ?? []) as Array<{ question_id: string; answer_status: string; compliance_engagement_id: string }>;
  const gaps = (gapsRows ?? []) as Array<{ title: string; severity: string; status: string; control_category: string }>;
  const documents = (documentsRows ?? []) as Array<{ id: string }>;
  const reports = (reportsRows ?? []) as Array<{ compliance_engagement_id: string; overall_score: number | null; generated_at: string | null }>;

  // Question count is per-engagement (each engagement has its own copy of the template's questions).
  // To weight correctly, multiply per-template question count by the number of engagements using it.
  const engagementsByTemplate = new Map<string, number>();
  for (const e of engagements) {
    engagementsByTemplate.set(e.template_id, (engagementsByTemplate.get(e.template_id) ?? 0) + 1);
  }
  const questionsByTemplate = new Map<string, typeof questions>();
  for (const q of questions) {
    const arr = questionsByTemplate.get(q.template_id) ?? [];
    arr.push(q);
    questionsByTemplate.set(q.template_id, arr);
  }

  // Total expected questions across all engagements
  let totalQuestions = 0;
  for (const [tplId, perTplQuestions] of questionsByTemplate.entries()) {
    const engagementCount = engagementsByTemplate.get(tplId) ?? 0;
    totalQuestions += perTplQuestions.length * engagementCount;
  }

  // Answered = anything that isn't missing/null
  const totalAnswered = answers.filter(
    a => a.answer_status === 'auto_filled' || a.answer_status === 'partial' || a.answer_status === 'manual',
  ).length;

  // High-risk open gaps
  const highRiskGapCount = gaps.filter(
    g => g.status === 'open' && (g.severity === 'critical' || g.severity === 'high'),
  ).length;

  // Average risk score: latest report per engagement (rows are pre-sorted desc)
  const latestPerEngagement = new Map<string, number>();
  for (const r of reports) {
    if (r.overall_score == null) continue;
    if (!latestPerEngagement.has(r.compliance_engagement_id)) {
      latestPerEngagement.set(r.compliance_engagement_id, r.overall_score);
    }
  }
  const scoreValues = [...latestPerEngagement.values()];
  const averageRiskScore =
    scoreValues.length > 0
      ? scoreValues.reduce((s, v) => s + v, 0) / scoreValues.length
      : null;

  // Coverage by domain — sum across all engagements
  const totalsByCategory = new Map<string, { answered: number; total: number }>();
  const questionCategoryById = new Map<string, string>();
  for (const q of questions) questionCategoryById.set(q.id, q.control_category);

  for (const [tplId, perTplQuestions] of questionsByTemplate.entries()) {
    const engagementCount = engagementsByTemplate.get(tplId) ?? 0;
    for (const q of perTplQuestions) {
      const bucket = totalsByCategory.get(q.control_category) ?? { answered: 0, total: 0 };
      bucket.total += engagementCount;
      totalsByCategory.set(q.control_category, bucket);
    }
  }
  for (const a of answers) {
    if (a.answer_status === 'missing') continue;
    const category = questionCategoryById.get(a.question_id);
    if (!category) continue;
    const bucket = totalsByCategory.get(category) ?? { answered: 0, total: 0 };
    bucket.answered += 1;
    totalsByCategory.set(category, bucket);
  }

  const coverageByDomain = [...totalsByCategory.entries()]
    .map(([category, { answered, total }]) => ({
      category,
      answered,
      total,
      pct: total > 0 ? Math.round((answered / total) * 100) : 0,
    }))
    .sort((a, b) => b.pct - a.pct);

  // Top gaps — group open gaps by title, take top 5 by count
  const gapCounts = new Map<string, number>();
  for (const g of gaps) {
    if (g.status !== 'open') continue;
    gapCounts.set(g.title, (gapCounts.get(g.title) ?? 0) + 1);
  }
  const topGaps = [...gapCounts.entries()]
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Per-engagement progress (answered / template question count)
  const answeredCountByEngagement = new Map<string, number>();
  for (const a of answers) {
    if (a.answer_status === 'missing') continue;
    answeredCountByEngagement.set(
      a.compliance_engagement_id,
      (answeredCountByEngagement.get(a.compliance_engagement_id) ?? 0) + 1,
    );
  }
  const progressByEngagement: Record<string, number> = {};
  for (const e of engagements) {
    const total = (questionsByTemplate.get(e.template_id) ?? []).length;
    const answered = answeredCountByEngagement.get(e.id) ?? 0;
    progressByEngagement[e.id] = total > 0 ? Math.round((answered / total) * 100) : 0;
  }

  return {
    totalEngagements: engagements.length,
    totalDocuments: documents.length,
    totalQuestions,
    totalAnswered,
    highRiskGapCount,
    averageRiskScore,
    coverageByDomain,
    topGaps,
    progressByEngagement,
  };
}

// ─── Evidence Intelligence ───────────────────────────────────────────────────

export type EvidenceOutcome = 'yes' | 'partial' | 'no' | 'missing';

export interface EvidenceSource {
  documentId: string;
  documentName: string;
  fileType: string | null;
  pageNumber: number | null;
  strength: EvidenceLink['strength'];
  snippet: string | null;
  /** 0–100; derived from snippet length, page presence, and strength */
  relevancePct: number;
}

export interface ConfidenceDrivers {
  /** Number of EvidenceLink rows attached to the answer */
  supportingSourceCount: number;
  /** Best link strength across the answer's evidence */
  bestStrength: EvidenceLink['strength'];
  /** "single-source" | "multi-source" — whether evidence spans >1 document */
  consistency: 'single-source' | 'multi-source' | 'none';
  /** True if any two links contradict (placeholder — false until conflict detection wired) */
  conflictsFound: boolean;
  /** "high" | "medium" | "low" — derived from snippet length & page citations */
  specificity: 'high' | 'medium' | 'low';
  /** One-line plain-language rationale */
  rationale: string;
}

export interface EvidenceQuestionRow {
  questionId: string;
  controlId: string | null;
  controlCategory: string;
  questionText: string;
  answerId: string | null;
  answerText: string | null;
  outcome: EvidenceOutcome;
  /** 0–100 or null when no answer */
  confidencePct: number | null;
  bestStrength: EvidenceLink['strength'];
  sourceCount: number;
  /** Concept tags drawn from intersection of expected_evidence_types ∩ document.evidence_types */
  matchedConcepts: string[];
  drivers: ConfidenceDrivers;
  sources: EvidenceSource[];
  generatedAt: string | null;
  extractionSource: string | null;
}

export interface EvidenceDocumentRow {
  documentId: string;
  fileName: string;
  fileType: string | null;
  pageCount: number | null;
  uploadedAt: string;
  extractionStatus: ComplianceDocument['extraction_status'];
  evidenceTypes: string[];
  /** Number of distinct questions this doc supports */
  questionsSupported: number;
  strongCount: number;
  partialCount: number;
  /** Average confidence across answers this doc supports (0–100, null if none) */
  avgConfidence: number | null;
  /** Question IDs this doc supports (for the detail panel) */
  supportedQuestionIds: string[];
  /** Categories not covered by this doc (vs full template) */
  uncoveredCategories: string[];
}

export interface EvidenceIntelligenceData {
  totals: {
    totalQuestions: number;
    answeredQuestions: number;
    coveragePct: number;
    strongCount: number;
    partialCount: number;
    missingCount: number;
    averageConfidence: number | null;
  };
  questions: EvidenceQuestionRow[];
  documents: EvidenceDocumentRow[];
  /** Distinct categories from the question template, useful for filters */
  categories: string[];
}

function relevanceFromLink(
  link: EvidenceLink,
  snippetLen: number,
): number {
  // Base on strength, then nudge for snippet length & a real page citation.
  const base = link.strength === 'strong' ? 80 : link.strength === 'partial' ? 55 : 25;
  const lengthBonus = Math.min(15, Math.floor(snippetLen / 60));
  const pageBonus = link.page_number != null ? 5 : 0;
  return Math.min(99, base + lengthBonus + pageBonus);
}

function specificityFor(sources: EvidenceSource[]): 'high' | 'medium' | 'low' {
  if (sources.length === 0) return 'low';
  const totalLen = sources.reduce((s, x) => s + (x.snippet?.length ?? 0), 0);
  const avg = totalLen / sources.length;
  const cited = sources.filter(s => s.pageNumber != null).length;
  if (avg >= 180 && cited >= 1) return 'high';
  if (avg >= 80) return 'medium';
  return 'low';
}

function rationaleFor(
  outcome: EvidenceOutcome,
  drivers: Omit<ConfidenceDrivers, 'rationale'>,
  matched: number,
): string {
  if (outcome === 'missing') {
    return 'No supporting evidence has been linked to this question yet.';
  }
  const parts: string[] = [];
  parts.push(
    drivers.supportingSourceCount === 1
      ? '1 supporting source'
      : `${drivers.supportingSourceCount} supporting sources`,
  );
  if (drivers.bestStrength === 'strong') parts.push('strong evidence');
  else if (drivers.bestStrength === 'partial') parts.push('partial evidence');
  else parts.push('weak evidence');

  if (drivers.consistency === 'multi-source') parts.push('consistent across documents');
  else if (drivers.consistency === 'single-source') parts.push('single source');

  if (matched > 0) {
    parts.push(matched === 1 ? '1 matched concept' : `${matched} matched concepts`);
  }

  if (drivers.specificity === 'high') parts.push('with specific cited language');
  else if (drivers.specificity === 'low') parts.push('but matched language is general');

  if (drivers.conflictsFound) parts.push('— conflicts detected');

  return parts.join(', ').replace(/, ([^,]*)$/, ' and $1') + '.';
}

function outcomeFor(
  answer: Answer | undefined,
  links: EvidenceLink[],
): EvidenceOutcome {
  if (!answer) return 'missing';
  if (answer.answer_status === 'missing') return 'missing';
  // No links at all — even if status is auto_filled, treat as partial signal
  if (links.length === 0) {
    if (answer.answer_status === 'manual' && answer.answer_text) return 'yes';
    return 'partial';
  }
  const hasStrong = links.some(l => l.strength === 'strong');
  const hasPartial = links.some(l => l.strength === 'partial');
  const allNone = links.every(l => l.strength === 'none');
  if (allNone) return 'no';
  if (hasStrong) return 'yes';
  if (hasPartial) return 'partial';
  return 'partial';
}

/**
 * Build the unified Evidence Intelligence dataset for one engagement.
 * Pulls questions, answers, evidence_links and documents in parallel and
 * derives all rationale / driver fields locally — no new DB columns required.
 */
export async function getEvidenceIntelligence(
  engagementId: string,
  templateId: string,
): Promise<EvidenceIntelligenceData> {
  const [questions, answers, links, documents] = await Promise.all([
    listQuestions(templateId),
    listAnswers(engagementId),
    listEvidenceLinks(engagementId),
    listDocuments(engagementId),
  ]);

  const docById = new Map(documents.map(d => [d.id, d]));
  const linksByAnswer = new Map<string, EvidenceLink[]>();
  for (const l of links) {
    const arr = linksByAnswer.get(l.answer_id) ?? [];
    arr.push(l);
    linksByAnswer.set(l.answer_id, arr);
  }
  const answerByQuestion = new Map<string, Answer>();
  for (const a of answers) answerByQuestion.set(a.question_id, a);

  const questionRows: EvidenceQuestionRow[] = questions.map(q => {
    const answer = answerByQuestion.get(q.id);
    const qLinks = answer ? linksByAnswer.get(answer.id) ?? [] : [];
    const sources: EvidenceSource[] = qLinks.map(l => {
      const doc = l.document_id ? docById.get(l.document_id) : undefined;
      const snippet = l.snippet_text ?? null;
      return {
        documentId: l.document_id ?? '',
        documentName: doc?.file_name ?? 'Unknown document',
        fileType: doc?.file_type ?? null,
        pageNumber: l.page_number,
        strength: l.strength,
        snippet,
        relevancePct: relevanceFromLink(l, snippet?.length ?? 0),
      };
    });
    sources.sort((a, b) => b.relevancePct - a.relevancePct);

    const outcome = outcomeFor(answer, qLinks);
    const bestStrength: EvidenceLink['strength'] =
      qLinks.some(l => l.strength === 'strong')
        ? 'strong'
        : qLinks.some(l => l.strength === 'partial')
          ? 'partial'
          : qLinks.length > 0
            ? 'none'
            : 'none';

    const distinctDocs = new Set(qLinks.map(l => l.document_id).filter(Boolean));
    const consistency: ConfidenceDrivers['consistency'] =
      distinctDocs.size === 0 ? 'none' : distinctDocs.size === 1 ? 'single-source' : 'multi-source';

    // Matched concepts: intersect question's expected types with the doc's evidence types
    const expected = new Set((q.expected_evidence_types ?? []).map(s => s.toLowerCase()));
    const matched = new Set<string>();
    for (const docId of distinctDocs) {
      const doc = docId ? docById.get(docId) : undefined;
      for (const t of doc?.evidence_types ?? []) {
        const norm = t.toLowerCase();
        if (expected.has(norm)) matched.add(t);
      }
    }
    const matchedConcepts = [...matched];

    const driversNoRationale: Omit<ConfidenceDrivers, 'rationale'> = {
      supportingSourceCount: qLinks.length,
      bestStrength,
      consistency,
      conflictsFound: false,
      specificity: specificityFor(sources),
    };
    const drivers: ConfidenceDrivers = {
      ...driversNoRationale,
      rationale: rationaleFor(outcome, driversNoRationale, matchedConcepts.length),
    };

    return {
      questionId: q.id,
      controlId: q.control_id,
      controlCategory: q.control_category,
      questionText: q.question_text,
      answerId: answer?.id ?? null,
      answerText: answer?.answer_text ?? null,
      outcome,
      confidencePct:
        answer?.confidence_score != null
          ? Math.round(answer.confidence_score <= 1 ? answer.confidence_score * 100 : answer.confidence_score)
          : null,
      bestStrength,
      sourceCount: qLinks.length,
      matchedConcepts,
      drivers,
      sources,
      generatedAt: answer?.updated_at ?? answer?.created_at ?? null,
      extractionSource: answer?.extraction_source ?? null,
    };
  });

  // Document-side aggregation
  const allCategories = [...new Set(questions.map(q => q.control_category).filter(Boolean))];
  const linksByDocument = new Map<string, EvidenceLink[]>();
  for (const l of links) {
    if (!l.document_id) continue;
    const arr = linksByDocument.get(l.document_id) ?? [];
    arr.push(l);
    linksByDocument.set(l.document_id, arr);
  }
  const answerById = new Map(answers.map(a => [a.id, a]));
  const questionById = new Map(questions.map(q => [q.id, q]));

  const documentRows: EvidenceDocumentRow[] = documents.map(doc => {
    const dLinks = linksByDocument.get(doc.id) ?? [];
    const supportedQs = new Set<string>();
    let strongCount = 0;
    let partialCount = 0;
    const confidenceSamples: number[] = [];
    const coveredCats = new Set<string>();
    for (const l of dLinks) {
      const ans = answerById.get(l.answer_id);
      if (!ans) continue;
      supportedQs.add(ans.question_id);
      if (l.strength === 'strong') strongCount++;
      if (l.strength === 'partial') partialCount++;
      if (ans.confidence_score != null) {
        const c = ans.confidence_score <= 1 ? ans.confidence_score * 100 : ans.confidence_score;
        confidenceSamples.push(c);
      }
      const q = questionById.get(ans.question_id);
      if (q?.control_category) coveredCats.add(q.control_category);
    }
    const avgConfidence =
      confidenceSamples.length > 0
        ? Math.round(confidenceSamples.reduce((a, b) => a + b, 0) / confidenceSamples.length)
        : null;

    return {
      documentId: doc.id,
      fileName: doc.file_name,
      fileType: doc.file_type,
      pageCount: doc.page_count,
      uploadedAt: doc.created_at,
      extractionStatus: doc.extraction_status,
      evidenceTypes: doc.evidence_types ?? [],
      questionsSupported: supportedQs.size,
      strongCount,
      partialCount,
      avgConfidence,
      supportedQuestionIds: [...supportedQs],
      uncoveredCategories: allCategories.filter(c => !coveredCats.has(c)),
    };
  });

  // Totals
  const strongCount = questionRows.filter(r => r.outcome === 'yes').length;
  const partialCount = questionRows.filter(r => r.outcome === 'partial').length;
  const missingCount = questionRows.filter(r => r.outcome === 'missing' || r.outcome === 'no').length;
  const answeredQuestions = questionRows.filter(r => r.outcome !== 'missing').length;
  const totalQuestions = questionRows.length;
  const coveragePct = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;
  const confSamples = questionRows.map(r => r.confidencePct).filter((v): v is number => v != null);
  const averageConfidence =
    confSamples.length > 0
      ? Math.round(confSamples.reduce((a, b) => a + b, 0) / confSamples.length)
      : null;

  return {
    totals: {
      totalQuestions,
      answeredQuestions,
      coveragePct,
      strongCount,
      partialCount,
      missingCount,
      averageConfidence,
    },
    questions: questionRows,
    documents: documentRows,
    categories: allCategories,
  };
}

// ─── Engagement workflow state ───────────────────────────────────────────────

export type WorkflowStepStatus = 'complete' | 'needs_review' | 'blocked' | 'in_progress' | 'not_started';

export interface WorkflowStep {
  key: 'framework' | 'evidence' | 'extraction' | 'gaps' | 'score' | 'report';
  label: string;
  description: string;
  status: WorkflowStepStatus;
  /** Optional plain-text hint about what to do next */
  hint?: string;
  /** Where the workspace landing should send the user when this step is the focus */
  href: string;
}

export interface EngagementWorkflowState {
  steps: WorkflowStep[];
  /** First step that isn't complete — what the user should do next */
  nextStep: WorkflowStep | null;
  completedCount: number;
  totalCount: number;
}

/**
 * Compose the 6-step workflow for one engagement using only existing data.
 * No new tables needed — every status is derived from documents, answers,
 * gaps, and reports rows that already exist.
 */
export async function getEngagementWorkflowState(
  engagementId: string,
  templateId: string,
): Promise<EngagementWorkflowState> {
  const supabase = await createClient();

  const [questionsResult, answersResult, documentsResult, gapsResult, reportsResult] =
    await Promise.all([
      supabase.from('questions').select('id', { count: 'exact', head: true }).eq('template_id', templateId),
      supabase.from('answers').select('answer_status').eq('compliance_engagement_id', engagementId),
      supabase.from('compliance_documents').select('extraction_status').eq('compliance_engagement_id', engagementId),
      supabase.from('compliance_gaps').select('status, severity').eq('compliance_engagement_id', engagementId),
      supabase.from('compliance_reports').select('id, generated_at').eq('compliance_engagement_id', engagementId).order('generated_at', { ascending: false }).limit(1),
    ]);

  const totalQuestions = questionsResult.count ?? 0;
  const answers = (answersResult.data ?? []) as Array<{ answer_status: string }>;
  const documents = (documentsResult.data ?? []) as Array<{ extraction_status: string }>;
  const gaps = (gapsResult.data ?? []) as Array<{ status: string; severity: string }>;
  const latestReport = (reportsResult.data ?? [])[0] ?? null;

  const docCount = documents.length;
  const docsFailed = documents.filter(d => d.extraction_status === 'failed').length;
  const docsRunning = documents.filter(d => d.extraction_status === 'running' || d.extraction_status === 'queued').length;
  const answeredCount = answers.filter(a => a.answer_status !== 'missing').length;
  const openHighGaps = gaps.filter(g => g.status === 'open' && (g.severity === 'critical' || g.severity === 'high')).length;
  const openGaps = gaps.filter(g => g.status === 'open').length;

  const steps: WorkflowStep[] = [
    {
      key: 'framework',
      label: 'Framework selected',
      description: 'Questionnaire and scoring weights are bound to the engagement.',
      status: 'complete',
      href: `/officer/engagements/${engagementId}/questionnaire`,
    },
    {
      key: 'evidence',
      label: 'Evidence uploaded',
      description: docCount === 0
        ? 'No documents yet — upload at least one to begin extraction.'
        : `${docCount} document${docCount === 1 ? '' : 's'} attached.`,
      status:
        docCount === 0
          ? 'not_started'
          : docsFailed > 0
            ? 'needs_review'
            : 'complete',
      hint: docsFailed > 0 ? `${docsFailed} failed to parse — re-upload or check the file.` : undefined,
      href: `/officer/engagements/${engagementId}/evidence-intelligence`,
    },
    {
      key: 'extraction',
      label: 'Answers extracted',
      description:
        totalQuestions === 0
          ? 'Waiting on questionnaire template.'
          : `${answeredCount} of ${totalQuestions} answers recorded.`,
      status:
        docsRunning > 0
          ? 'in_progress'
          : answeredCount === 0
            ? docCount === 0 ? 'blocked' : 'not_started'
            : answeredCount < totalQuestions
              ? 'in_progress'
              : 'complete',
      hint:
        docCount === 0
          ? 'Upload evidence first so the AI has something to extract.'
          : answeredCount < totalQuestions && docsRunning === 0
            ? `${totalQuestions - answeredCount} answers still missing — review and add manually if needed.`
            : undefined,
      href: `/officer/engagements/${engagementId}/evidence-intelligence`,
    },
    {
      key: 'gaps',
      label: 'Gaps reviewed',
      description:
        gaps.length === 0
          ? 'No gaps recorded yet.'
          : `${openGaps} open gap${openGaps === 1 ? '' : 's'} (${openHighGaps} high-risk).`,
      status:
        answeredCount === 0
          ? 'blocked'
          : gaps.length === 0
            ? 'not_started'
            : openHighGaps > 0
              ? 'needs_review'
              : openGaps > 0
                ? 'in_progress'
                : 'complete',
      hint: openHighGaps > 0 ? 'High-risk gaps need follow-up before scoring.' : undefined,
      href: `/officer/engagements/${engagementId}/gaps`,
    },
    {
      key: 'score',
      label: 'Risk score generated',
      description: latestReport ? 'Score available from latest report.' : 'No score generated yet.',
      status:
        answeredCount === 0
          ? 'blocked'
          : latestReport
            ? 'complete'
            : 'not_started',
      hint:
        answeredCount === 0
          ? 'Extract answers before scoring.'
          : !latestReport
            ? 'Generate the risk score from the report screen.'
            : undefined,
      href: `/officer/engagements/${engagementId}/risk-score`,
    },
    {
      key: 'report',
      label: 'Report ready',
      description: latestReport
        ? `Generated ${latestReport.generated_at ? new Date(latestReport.generated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'recently'}.`
        : 'Report has not been generated.',
      status: latestReport ? (openHighGaps > 0 ? 'needs_review' : 'complete') : answeredCount === 0 ? 'blocked' : 'not_started',
      hint: latestReport && openHighGaps > 0 ? 'Open high-risk gaps remain — consider regenerating after follow-up.' : undefined,
      href: `/officer/engagements/${engagementId}/report`,
    },
  ];

  const nextStep = steps.find(s => s.status !== 'complete') ?? null;
  const completedCount = steps.filter(s => s.status === 'complete').length;

  return {
    steps,
    nextStep,
    completedCount,
    totalCount: steps.length,
  };
}

/**
 * Bundle the data the EngagementContextHeader needs (org name + workflow state)
 * in a single helper so engagement-scoped pages can render the contextual
 * header with one call instead of repeating the same boilerplate.
 */
export async function getEngagementContext(
  engagement: ComplianceEngagement,
  userId: string,
): Promise<{ orgName: string; workflow: EngagementWorkflowState }> {
  const supabase = await createClient();
  const [workflow, roleResult] = await Promise.all([
    getEngagementWorkflowState(engagement.id, engagement.template_id),
    supabase.from('user_roles').select('org_name').eq('user_id', userId).maybeSingle(),
  ]);
  const orgName = roleResult.data?.org_name ?? 'My Organization';
  return { orgName, workflow };
}
