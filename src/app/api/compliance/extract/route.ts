/**
 * POST /api/compliance/extract
 *
 * Full extraction pipeline for a compliance document:
 *   1. Download file from Supabase Storage
 *   2. Parse text (PDF / DOCX / XLSX / PPTX)
 *   3. Chunk into ~500-token segments and persist to document_chunks
 *   4. For each question in the engagement, run BM25 retrieval
 *   5. Call LLM extractor in category batches of 8 questions
 *   6. Write answers, evidence_links, and compliance_runs to DB
 *   7. Update compliance_documents.extraction_status
 *
 * This route is called by the upload modal after a successful upload.
 * It is idempotent: re-running on the same document replaces previous results.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServiceClient } from '@/lib/supabase/service';
import { parseDocument } from '@/lib/parsers';
import { chunkDocument } from '@/lib/documents/chunker';
import { retrieveChunksForQuestion } from '@/lib/documents/retrieval';
import { extractEvidence, type ExtractionInput } from '@/lib/documents/extractor';
import { getOpenRouterModel } from '@/lib/llm/openrouter';
import { FRAMEWORKS } from '@/lib/scoring/frameworks';
import type { FrameworkId } from '@/lib/scoring/frameworks';
import {
  computeDimensionScores,
  computeCompositeFromDimensions,
  deriveDecision,
} from '@/lib/compliance/scoring';
import type { Answer, EvidenceLink, Question } from '@/lib/compliance/types';

interface RequestBody {
  document_id: string;
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

  const { document_id, engagement_id } = body;
  if (!document_id || !engagement_id) {
    return NextResponse.json({ error: 'Missing document_id or engagement_id' }, { status: 400 });
  }

  // Auth: caller must be vendor or reviewer
  const { data: engagement } = await supabase
    .from('compliance_engagements')
    .select('id, template_id, vendor_user_id, reviewer_user_id')
    .eq('id', engagement_id)
    .maybeSingle();

  if (!engagement) return NextResponse.json({ error: 'Engagement not found' }, { status: 404 });
  if (engagement.vendor_user_id !== user.id && engagement.reviewer_user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch the document record
  const { data: doc } = await supabase
    .from('compliance_documents')
    .select('id, file_name, file_type, storage_path, extraction_status')
    .eq('id', document_id)
    .eq('compliance_engagement_id', engagement_id)
    .maybeSingle();

  if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  if (doc.extraction_status === 'running') {
    return NextResponse.json({ message: 'Extraction already running' }, { status: 202 });
  }

  // Server-side writes use the service role client so they aren't blocked by
  // RLS policies scoped to the vendor. Auth/authorization was already checked
  // above against the user-auth client.
  const svc = getServiceClient() ?? supabase;

  // Mark as running
  await svc
    .from('compliance_documents')
    .update({ extraction_status: 'running' })
    .eq('id', document_id);

  // ─── 1. Download from Storage ────────────────────────────────────────────
  const { data: fileData, error: downloadError } = await svc.storage
    .from('documents')
    .download(doc.storage_path!);

  if (downloadError || !fileData) {
    await markFailed(svc, document_id, `Storage download failed: ${downloadError?.message}`);
    return NextResponse.json({ error: 'File download failed', detail: downloadError?.message }, { status: 500 });
  }

  const buffer = Buffer.from(await fileData.arrayBuffer());

  if (buffer.length === 0) {
    await markFailed(svc, document_id, 'Downloaded file is 0 bytes');
    return NextResponse.json({ error: 'File download failed', detail: 'File is empty in storage' }, { status: 500 });
  }

  // ─── 2. Parse text ───────────────────────────────────────────────────────
  const mimeMap: Record<string, string> = {
    pdf:  'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt:  'text/plain',
    csv:  'text/csv',
  };
  const mimeType = mimeMap[doc.file_type ?? ''] ?? 'application/pdf';

  let parsedText = '';
  try {
    const { text } = await parseDocument(buffer, mimeType);
    parsedText = text;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    await markFailed(svc, document_id, `Parse failed: ${detail}`);
    return NextResponse.json({ error: 'Document parse failed', detail }, { status: 422 });
  }

  // ─── 3. Chunk + persist ──────────────────────────────────────────────────
  // Delete old chunks (idempotent re-run)
  await svc.from('document_chunks').delete().eq('document_id', document_id);

  const chunks = chunkDocument(parsedText);
  if (chunks.length > 0) {
    const chunkRows = chunks.map(c => ({
      document_id,
      compliance_engagement_id: engagement_id,
      chunk_index: c.chunk_index,
      chunk_text: c.chunk_text,
      token_count: c.token_count,
      page_number: c.page_number,
      section_header: c.section_header,
    }));

    // Insert in batches of 100 to stay under PostgREST body limits
    for (let i = 0; i < chunkRows.length; i += 100) {
      await svc.from('document_chunks').insert(chunkRows.slice(i, i + 100));
    }
  }

  // Update page count from max page_number seen
  const maxPage = chunks.reduce((m, c) => Math.max(m, c.page_number ?? 0), 0);
  if (maxPage > 0) {
    await svc
      .from('compliance_documents')
      .update({ page_count: maxPage })
      .eq('id', document_id);
  }

  // ─── 4. Auto-detect framework if agnostic or unset ──────────────────────
  // When the engagement has no specific framework (agnostic) or was created
  // without one, detect the best-matching framework from the document text.
  let effectiveTemplateId = engagement.template_id;
  let detectedFramework: string | null = null;

  if (!effectiveTemplateId || effectiveTemplateId === 'agnostic') {
    const detected = detectFramework(parsedText, doc.file_name);
    if (detected.framework_id !== 'agnostic') {
      effectiveTemplateId = detected.template_id;
      detectedFramework = detected.framework_id;

      // Backfill the engagement so future calls use the detected framework
      await svc
        .from('compliance_engagements')
        .update({ framework_id: detected.framework_id, template_id: detected.template_id })
        .eq('id', engagement_id);
    }
  }

  // ─── 5. Load questions ───────────────────────────────────────────────────
  const { data: questions } = await svc
    .from('questions')
    .select('id, question_text, control_category, control_id, expected_evidence_types')
    .eq('template_id', effectiveTemplateId)
    .order('sort_order', { ascending: true });

  if (!questions || questions.length === 0) {
    await markComplete(svc, document_id);
    return NextResponse.json({
      message: 'No questions found for this framework',
      detected_framework: detectedFramework,
      template_id: effectiveTemplateId,
      hint: 'The questions seed migration (00055) may not have run. Check your database.',
    });
  }

  // Infer document metadata from filename/type for the extractor prompt
  const docMetadata = {
    document_type: inferDocumentType(doc.file_name, doc.file_type ?? ''),
    document_date: null as string | null,
    issuing_entity: null as string | null,
    file_name: doc.file_name,
  };

  // ─── 5 + 6. Retrieve + Extract + Write results ───────────────────────────
  const model = getOpenRouterModel('extract');

  // Delete previous run records and answers from this document
  await svc
    .from('compliance_runs')
    .delete()
    .eq('document_id', document_id)
    .eq('compliance_engagement_id', engagement_id);

  // Build all inputs first (retrieve chunks in parallel per question)
  const allInputs: ExtractionInput[] = await Promise.all(
    questions.map(async question => {
      const candidateChunks = await retrieveChunksForQuestion(svc, document_id, question.question_text, 10);
      return {
        question_id: question.id,
        question_text: question.question_text,
        question_context: `${question.control_category}${question.control_id ? ` → ${question.control_id}` : ''}`,
        candidate_chunks: candidateChunks,
        document_metadata: docMetadata,
      };
    })
  );

  // Run extraction in one batched call (extractor handles internal BATCH_SIZE splitting)
  let allResults;
  try {
    allResults = await extractEvidence(allInputs, model);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    await markFailed(svc, document_id, `LLM extraction failed: ${detail}`);
    return NextResponse.json({
      error: 'LLM extraction failed',
      detail,
      hint: 'Check that OPENROUTER_API_KEY is set and has credits, or configure OPENROUTER_MODEL_EXTRACT.',
    }, { status: 502 });
  }

  // Diagnostics counters
  let answersWritten = 0;
  let unansweredCount = 0;
  const llmErrors: string[] = [];

  const inputByQuestionId = new Map(allInputs.map(i => [i.question_id, i]));

  for (const result of allResults) {
    const input = inputByQuestionId.get(result.question_id);
    const candidateChunks = input?.candidate_chunks ?? [];

    // Create a run record
    await svc
      .from('compliance_runs')
      .insert({
        compliance_engagement_id: engagement_id,
        document_id,
        question_id: result.question_id,
        status: 'complete',
        raw_llm_output: result as unknown as Record<string, unknown>,
        model_used: model,
        chunk_ids: candidateChunks.map(c => c.id),
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });

    if (result.status === 'unanswered') {
      unansweredCount++;
      if (result.reasoning?.startsWith('LLM')) llmErrors.push(result.reasoning);
      continue;
    }

    answersWritten++;

    // Map confidence to strength
    const strength = result.confidence >= 0.75 ? 'strong' : result.confidence >= 0.35 ? 'partial' : 'none';

    // Upsert the answer
    const { data: answer, error: answerError } = await svc
      .from('answers')
      .upsert({
        compliance_engagement_id: engagement_id,
        question_id: result.question_id,
        answer_text: result.answer,
        answer_status: result.status === 'auto_filled' ? 'auto_filled' : 'partial',
        confidence_score: result.confidence,
        extraction_source: document_id,
        reasoning: result.reasoning,
        flags: result.flags,
        submitted_by: user.id,
        submitted_at: new Date().toISOString(),
      }, { onConflict: 'compliance_engagement_id,question_id' })
      .select('id')
      .single();

    if (!answer) {
      if (answerError) {
        console.error('[extract] answers upsert failed:', answerError.message, answerError);
        llmErrors.push(`answers upsert failed: ${answerError.message}`);
      }
      continue;
    }

    // Insert evidence links
    for (const link of result.evidence_links) {
      const chunk = (input?.candidate_chunks ?? []).find(c => c.id === link.chunk_id);
      await svc.from('evidence_links').insert({
        compliance_engagement_id: engagement_id,
        answer_id: answer.id,
        document_id,
        snippet_text: link.snippet,
        page_number: link.page,
        strength,
        chunk_id: link.chunk_id,
        chunk_index: chunk?.chunk_index ?? null,
        relevance_score: link.relevance,
        flags: result.flags.length > 0 ? result.flags : null,
      });
    }
  }

  // ─── 7. Mark complete ────────────────────────────────────────────────────
  await markComplete(svc, document_id);

  // ─── 8. Recompute scores + generate gaps (non-blocking, best-effort) ─────
  try {
    const frameworkConfig = FRAMEWORKS[engagement.template_id as FrameworkId]
      ?? Object.values(FRAMEWORKS).find(f => f.template_id === engagement.template_id);

    if (frameworkConfig) {
      const [{ data: allAnswers }, { data: allLinks }, { data: allQuestions }] = await Promise.all([
        svc
          .from('answers')
          .select('id, question_id, answer_status, confidence_score')
          .eq('compliance_engagement_id', engagement_id),
        svc
          .from('evidence_links')
          .select('id, answer_id, strength')
          .eq('compliance_engagement_id', engagement_id),
        svc
          .from('questions')
          .select('id, control_category, weight, expected_evidence_types, is_required')
          .eq('template_id', engagement.template_id),
      ]);

      const dimResults = computeDimensionScores({
        answers: (allAnswers ?? []) as Answer[],
        evidenceLinks: (allLinks ?? []) as EvidenceLink[],
        questions: (allQuestions ?? []) as Question[],
        weights: frameworkConfig.weights,
      });

      const { composite, confidence } = computeCompositeFromDimensions(dimResults, frameworkConfig.weights);
      const decision = deriveDecision(composite, confidence, frameworkConfig.decision_thresholds);

      for (const r of dimResults) {
        await svc
          .from('compliance_scores')
          .upsert({
            compliance_engagement_id: engagement_id,
            dimension: r.dimension,
            score: r.score,
            confidence: r.confidence,
            computed_at: new Date().toISOString(),
          }, { onConflict: 'compliance_engagement_id,dimension' });
      }

      await svc.from('audit_log').insert({
        engagement_id,
        user_id: user.id,
        action: 'compliance_scores_recomputed',
        entity: 'compliance_scores',
        after: { composite, confidence, decision },
      }).maybeSingle();
    }
  } catch (err) {
    console.error('[extract] Post-extraction score recompute failed (non-fatal):', err);
  }

  return NextResponse.json({
    document_id,
    chunks_created: chunks.length,
    questions_processed: questions.length,
    answers_written: answersWritten,
    unanswered_count: unansweredCount,
    detected_framework: detectedFramework,
    llm_errors: llmErrors.length > 0 ? llmErrors : undefined,
    status: 'complete',
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function markFailed(supabase: any, documentId: string, reason: string) {
  await supabase
    .from('compliance_documents')
    .update({ extraction_status: 'failed' })
    .eq('id', documentId);
  console.error(`[extract] Document ${documentId} failed: ${reason}`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function markComplete(supabase: any, documentId: string) {
  await supabase
    .from('compliance_documents')
    .update({ extraction_status: 'complete' })
    .eq('id', documentId);
}

function inferDocumentType(fileName: string, fileType: string): string {
  const lower = fileName.toLowerCase();
  if (lower.includes('soc') && lower.includes('2')) return 'soc2_report';
  if (lower.includes('soc') && lower.includes('1')) return 'soc1_report';
  if (lower.includes('iso') || lower.includes('27001')) return 'iso_certificate';
  if (lower.includes('dpa') || lower.includes('data_processing')) return 'dpa';
  if (lower.includes('privacy') || lower.includes('gdpr')) return 'privacy_policy';
  if (lower.includes('policy') || lower.includes('procedure')) return 'policy_document';
  if (lower.includes('penetration') || lower.includes('pentest')) return 'pentest_report';
  if (lower.includes('audit')) return 'audit_report';
  if (lower.includes('architecture') || lower.includes('diagram')) return 'architecture_doc';
  if (fileType === 'xlsx' || fileType === 'csv') return 'spreadsheet';
  return 'unknown';
}

/**
 * Score a document's text against each framework's keyword signals.
 * Returns the best-matching framework_id and its template_id.
 * Used to auto-detect framework when the engagement is set to 'agnostic'
 * or when no framework was chosen at engagement creation time.
 */
function detectFramework(text: string, fileName: string): { framework_id: string; template_id: string } {
  const lower = (text.slice(0, 8000) + ' ' + fileName).toLowerCase();

  const scores: Record<string, number> = {
    soc2: 0,
    vdd: 0,
    financial_controls: 0,
  };

  // SOC 2 signals
  const soc2Terms = [
    'soc 2', 'soc2', 'trust services', 'aicpa', 'tsc', 'cc6', 'cc7', 'cc8',
    'multi-factor authentication', 'mfa', 'penetration test', 'change management',
    'availability', 'confidentiality', 'incident response', 'logical access',
    'user provisioning', 'deprovisioning', 'encryption at rest', 'tls',
  ];
  for (const t of soc2Terms) {
    let pos = 0;
    while ((pos = lower.indexOf(t, pos)) !== -1) { scores.soc2 += 1; pos += t.length; }
  }

  // VDD signals
  const vddTerms = [
    'vendor due diligence', 'vdd', 'audited financial', 'financial statements',
    'debt-to-equity', 'working capital', 'litigation', 'contingencies',
    'burn rate', 'runway', 'uptime sla', 'disaster recovery', 'rto', 'rpo',
    'sub-processor', 'data processing agreement', 'dpa', 'exit rights',
    'penetration test', 'iso 27001', 'pci dss', 'data residency',
    'key-person', 'succession', 'm&a', 'ownership changes',
  ];
  for (const t of vddTerms) {
    let pos = 0;
    while ((pos = lower.indexOf(t, pos)) !== -1) { scores.vdd += 1; pos += t.length; }
  }

  // Financial controls signals
  const finTerms = [
    'sox', 'itgc', 'segregation of duties', 'financial controls',
    'general ledger', 'journal entry', 'financial reporting', 'pcaob',
    'internal controls', 'control deficiency', 'material weakness',
  ];
  for (const t of finTerms) {
    let pos = 0;
    while ((pos = lower.indexOf(t, pos)) !== -1) { scores.financial_controls += 1; pos += t.length; }
  }

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];

  // Must beat a minimum signal threshold to override agnostic
  if (best[1] >= 2) {
    const templateMap: Record<string, string> = {
      soc2: 'soc2_vendor',
      vdd: 'vdd',
      financial_controls: 'financial_controls',
    };
    return { framework_id: best[0], template_id: templateMap[best[0]] };
  }

  return { framework_id: 'agnostic', template_id: 'agnostic' };
}
