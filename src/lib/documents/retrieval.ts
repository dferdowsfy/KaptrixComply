/**
 * BM25-inspired retrieval over document chunks stored in Supabase.
 *
 * Uses PostgreSQL full-text search (tsvector/tsquery) for the dense keyword
 * pass, supplemented by a lightweight TF-IDF re-rank in memory. This avoids
 * a separate vector-DB dependency while giving reasonable recall for
 * compliance text (control names, regulation IDs, technical terms).
 *
 * Upgrade path: replace rankChunks() with a cross-encoder call once an
 * embedding model is integrated.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface RetrievedChunk {
  id: string;
  chunk_index: number;
  chunk_text: string;
  token_count: number | null;
  page_number: number | null;
  section_header: string | null;
  relevance: number; // 0.0 – 1.0
}

/**
 * Given a question string, retrieve the top-k most relevant chunks for a
 * document using Postgres FTS + in-memory TF-IDF re-rank.
 */
export async function retrieveChunksForQuestion(
  supabase: SupabaseClient,
  documentId: string,
  question: string,
  topK: number = 10,
): Promise<RetrievedChunk[]> {
  const terms = extractKeyTerms(question);
  if (terms.length === 0) return [];

  // Build a tsquery: all key terms OR-joined so any match returns rows
  const tsquery = terms.map(t => t.replace(/'/g, "''")).join(' | ');

  const { data: rows, error } = await supabase
    .from('document_chunks')
    .select('id, chunk_index, chunk_text, token_count, page_number, section_header')
    .eq('document_id', documentId)
    .textSearch('chunk_text', tsquery, { type: 'websearch', config: 'english' })
    .limit(Math.min(topK * 3, 50)); // over-fetch then re-rank

  if (error || !rows || rows.length === 0) return [];

  const scored = rows.map(row => ({
    ...row,
    relevance: scoreTfIdf(row.chunk_text, terms),
  }));

  scored.sort((a, b) => b.relevance - a.relevance);

  return scored.slice(0, topK).map(r => ({
    id: r.id,
    chunk_index: r.chunk_index,
    chunk_text: r.chunk_text,
    token_count: r.token_count ?? null,
    page_number: r.page_number ?? null,
    section_header: r.section_header ?? null,
    relevance: r.relevance,
  }));
}

/**
 * Retrieve chunks for multiple questions simultaneously (shared by category).
 * Returns a map of question_id → top chunks.
 */
export async function retrieveChunksForQuestions(
  supabase: SupabaseClient,
  documentId: string,
  questions: Array<{ id: string; question_text: string }>,
  topK: number = 10,
): Promise<Map<string, RetrievedChunk[]>> {
  const result = new Map<string, RetrievedChunk[]>();

  // Deduplicate: if questions share terms we can batch retrieve then re-rank
  // per question. For simplicity, run in parallel per question.
  await Promise.all(
    questions.map(async q => {
      const chunks = await retrieveChunksForQuestion(supabase, documentId, q.question_text, topK);
      result.set(q.id, chunks);
    }),
  );

  return result;
}

// ─── Private helpers ───────────────────────────────────────────────────────

/** Extract meaningful search terms from a question string. */
function extractKeyTerms(question: string): string[] {
  const stopWords = new Set([
    'a','an','the','is','are','was','were','do','does','did','have','has','had',
    'be','been','being','will','would','could','should','may','might','shall',
    'you','we','they','it','i','your','our','their','its','my',
    'in','on','at','to','for','of','and','or','not','with','from','by',
    'as','that','this','these','those','any','all','if','whether','how',
    'what','which','when','where','who',
  ]);

  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w))
    .slice(0, 15); // cap to 15 terms to keep the query manageable
}

/** Simple TF-IDF-like score: sum of term frequencies weighted by term length. */
function scoreTfIdf(text: string, terms: string[]): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const term of terms) {
    // Count occurrences
    let pos = 0;
    let count = 0;
    while ((pos = lower.indexOf(term, pos)) !== -1) {
      count++;
      pos += term.length;
    }
    if (count > 0) {
      // Weight by term length (longer = more specific = higher signal)
      score += count * (1 + Math.log(term.length));
    }
  }
  // Normalise by text length to avoid bias toward longer chunks
  const norm = Math.log(text.length + 1);
  return norm > 0 ? score / norm : 0;
}
