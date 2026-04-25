/**
 * Compliance evidence extractor.
 *
 * Implements the extraction contract from the spec:
 *   - status: auto_filled | partial | unanswered
 *   - answer, confidence, reasoning, evidence_links[], flags[]
 *
 * Bias is toward under-filling. A blank answer is recoverable; a false
 * auto-fill corrupts downstream scoring.
 */

import { openRouterChat } from '@/lib/llm/openrouter';
import type { RetrievedChunk } from './retrieval';

export interface ExtractionInput {
  question_id: string;
  question_text: string;
  question_context: string;         // e.g. "Security Controls → Encryption"
  candidate_chunks: RetrievedChunk[];
  document_metadata: {
    document_type: string;          // 'policy', 'soc2_report', 'dpa', etc.
    document_date: string | null;
    issuing_entity: string | null;
    file_name: string;
  };
}

export interface EvidenceLink {
  snippet: string;
  page: number | null;
  section: string | null;
  chunk_id: string;
  relevance: number;
}

export type ExtractionFlag =
  | 'contradiction'
  | 'stale_date'
  | 'scope_mismatch'
  | 'vendor_attestation_only'
  | 'boilerplate_only'
  | 'policy_without_attestation'
  | 'partial_scope';

export interface ExtractionResult {
  question_id: string;
  status: 'auto_filled' | 'partial' | 'unanswered';
  answer: string | null;
  confidence: number;
  reasoning: string;
  evidence_links: EvidenceLink[];
  flags: ExtractionFlag[];
}

// Skip the LLM entirely when the best-matching chunk is below this relevance.
const MIN_RELEVANCE_THRESHOLD = 0.05;

// Batch size: questions sharing the same control category can share context.
const BATCH_SIZE = 8;

const SYSTEM_PROMPT = `You are a compliance evidence extractor for Kaptrix, an AI diligence platform. Your job is to determine whether an uploaded compliance document answers a specific questionnaire question, and if so, extract the exact evidence that supports that answer. You do not write compliance policy. You do not infer. You do not summarize beyond what the document says. You extract, classify, and cite.

Your bias is toward under-filling, not over-filling. A blank answer is recoverable. A false auto-filled answer corrupts downstream scoring and misleads the diligence team. When in doubt, mark the question partial or unanswered and explain why.

HARD RULES — violating these corrupts the pipeline:
- Never invent evidence. If a snippet doesn't exist in the candidate chunks, you cannot cite it.
- Never paraphrase inside the snippet field. Snippets must be verbatim from the document.
- Never mark a question auto_filled without at least one evidence link.
- Never assume scope. If the document is ambiguous about whether a control applies, mark partial with scope_mismatch.
- Never fill from general compliance knowledge. Your training data knows what SOC 2 controls typically look like. Do not use that to fill gaps the document leaves.
- Never merge contradicting chunks into a single confident answer. Mark partial with contradiction and cite both.
- Treat vendor attestations as weaker than first-party statements.

STATUS DEFINITIONS:
- auto_filled: Direct, unambiguous, specific (not boilerplate), current, in-scope evidence fully answers the question. Confidence ≥ 0.75.
- partial: Evidence addresses the area but is incomplete, indirect, scoped unclearly, stale, or contradictory. Confidence 0.35–0.74.
- unanswered: No relevant evidence found, or evidence is too weak. Confidence < 0.35. This is a valid, preferred outcome.

CONFIDENCE CALIBRATION:
- 0.90–1.00: Unambiguous, direct, recent, in-scope. Would survive any reviewer challenge.
- 0.75–0.89: Direct but with minor scope/specificity questions.
- 0.50–0.74: Evidence exists but has real gaps.
- 0.25–0.49: Weak, indirect, or mostly inferred.
- 0.00–0.24: No meaningful evidence.

FLAGS:
- contradiction: conflicting chunks
- stale_date: evidence older than freshness threshold
- scope_mismatch: control may not apply to this product/scope
- vendor_attestation_only: third-party attestation, not first-party control
- boilerplate_only: generic policy text, no implementation specifics
- policy_without_attestation: policy stated but not attested as operational
- partial_scope: covers part of what the question asks

Return a JSON object with a single key "results" whose value is an array of extraction results — one per question. No markdown, no extra top-level keys, no prose outside the JSON. Exact shape:

{
  "results": [
    {
      "question_id": "string",
      "status": "auto_filled" | "partial" | "unanswered",
      "answer": "string or null",
      "confidence": 0.0 to 1.0,
      "reasoning": "one to two sentences",
      "evidence_links": [
        {
          "snippet": "verbatim ≤50 words from document",
          "page": integer or null,
          "section": "string or null",
          "chunk_id": "string",
          "relevance": 0.0 to 1.0
        }
      ],
      "flags": ["flag1", "flag2"]
    }
  ]
}

Even if only one question is provided, "results" must still be an array.`;

function buildUserPrompt(inputs: ExtractionInput[]): string {
  const parts: string[] = [];

  for (const input of inputs) {
    // Skip questions where best chunk relevance is below threshold
    const maxRelevance = Math.max(...input.candidate_chunks.map(c => c.relevance), 0);
    if (maxRelevance < MIN_RELEVANCE_THRESHOLD || input.candidate_chunks.length === 0) {
      continue;
    }

    const chunksText = input.candidate_chunks
      .slice(0, 10)
      .map((c, i) =>
        `Chunk ${i + 1} [id:${c.id}${c.page_number != null ? ` page:${c.page_number}` : ''}${c.section_header ? ` section:"${c.section_header}"` : ''}]:\n${c.chunk_text}`,
      )
      .join('\n\n---\n\n');

    parts.push(`=== QUESTION ===
question_id: ${input.question_id}
question: ${input.question_text}
context: ${input.question_context}
document: ${input.document_metadata.file_name} (type: ${input.document_metadata.document_type}, date: ${input.document_metadata.document_date ?? 'unknown'}, issuer: ${input.document_metadata.issuing_entity ?? 'unknown'})

CANDIDATE CHUNKS:
${chunksText}`);
  }

  // For questions with no chunks, still include them so the model marks them unanswered
  const noChunkQuestions = inputs.filter(
    i => i.candidate_chunks.length === 0 || Math.max(...i.candidate_chunks.map(c => c.relevance), 0) < MIN_RELEVANCE_THRESHOLD,
  );
  if (noChunkQuestions.length > 0) {
    parts.push(noChunkQuestions.map(q =>
      `=== QUESTION ===\nquestion_id: ${q.question_id}\nquestion: ${q.question_text}\ncontext: ${q.question_context}\nCANDIDATE CHUNKS: (none — no relevant chunks found)`,
    ).join('\n\n'));
  }

  return parts.join('\n\n====\n\n');
}

/** Run extraction for a batch of questions against a set of pre-retrieved chunks. */
export async function extractEvidence(
  inputs: ExtractionInput[],
  model = 'openai/gpt-4o-mini',
): Promise<ExtractionResult[]> {
  if (inputs.length === 0) return [];

  const results: ExtractionResult[] = [];

  // Process in batches to stay within context limits
  for (let i = 0; i < inputs.length; i += BATCH_SIZE) {
    const batch = inputs.slice(i, i + BATCH_SIZE);
    const userPrompt = buildUserPrompt(batch);

    let raw = '';
    try {
      const { content } = await openRouterChat({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.0,
        maxTokens: 4000,
        jsonMode: true,
        timeoutMs: 90_000,
      });
      raw = content;
    } catch (err) {
      // On LLM failure, mark all batch questions as unanswered
      for (const input of batch) {
        results.push(unansweredResult(input.question_id, `LLM call failed: ${String(err)}`));
      }
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      for (const input of batch) {
        results.push(unansweredResult(input.question_id, 'LLM returned invalid JSON'));
      }
      continue;
    }

    // json_object mode forces an object at root. Unwrap common shapes:
    //   { results: [...] } / { data: [...] } / { answers: [...] } / { extraction: [...] }
    //   { question_id, status, ... }  ← single-result object, wrap it
    //   { "<any key>": [...] }        ← first array-valued property
    if (!Array.isArray(parsed) && typeof parsed === 'object' && parsed !== null) {
      const obj = parsed as Record<string, unknown>;
      const known = obj.results ?? obj.data ?? obj.answers ?? obj.extraction ?? obj.items;
      if (Array.isArray(known)) {
        parsed = known;
      } else if (typeof obj.question_id === 'string' && typeof obj.status === 'string') {
        parsed = [obj];
      } else {
        const firstArray = Object.values(obj).find(v => Array.isArray(v));
        if (firstArray) parsed = firstArray;
      }
    }

    if (!Array.isArray(parsed)) {
      const preview = raw.slice(0, 200).replace(/\s+/g, ' ');
      for (const input of batch) {
        results.push(unansweredResult(input.question_id, `LLM response was not an array (raw: ${preview})`));
      }
      continue;
    }

    // Build a map of question_id → result for fast lookup
    const byId = new Map<string, ExtractionResult>();
    for (const item of parsed as unknown[]) {
      if (!isValidResult(item)) continue;
      byId.set(item.question_id, item);
    }

    // For any question not in the response, add a safe unanswered fallback
    for (const input of batch) {
      results.push(byId.get(input.question_id) ?? unansweredResult(input.question_id, 'Not included in LLM response'));
    }
  }

  return results;
}

function unansweredResult(questionId: string, reason: string): ExtractionResult {
  return {
    question_id: questionId,
    status: 'unanswered',
    answer: null,
    confidence: 0,
    reasoning: reason,
    evidence_links: [],
    flags: [],
  };
}

function isValidResult(item: unknown): item is ExtractionResult {
  if (!item || typeof item !== 'object') return false;
  const r = item as Record<string, unknown>;
  return (
    typeof r.question_id === 'string' &&
    (r.status === 'auto_filled' || r.status === 'partial' || r.status === 'unanswered') &&
    typeof r.confidence === 'number' &&
    typeof r.reasoning === 'string' &&
    Array.isArray(r.evidence_links) &&
    Array.isArray(r.flags)
  );
}
