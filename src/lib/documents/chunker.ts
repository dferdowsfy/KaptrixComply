/**
 * Text chunker for compliance documents.
 *
 * Splits raw document text into overlapping chunks of ~500 tokens with
 * ~100-token overlap, preserving detected page breaks and section headers.
 *
 * "Token" here uses the standard ~4-chars-per-token heuristic — close
 * enough for retrieval budget purposes without a tokeniser dependency.
 */

export interface TextChunk {
  chunk_index: number;
  chunk_text: string;
  token_count: number;
  page_number: number | null;
  section_header: string | null;
}

const TARGET_TOKENS = 500;
const OVERLAP_TOKENS = 100;
const CHARS_PER_TOKEN = 4;

const TARGET_CHARS = TARGET_TOKENS * CHARS_PER_TOKEN;   // 2000
const OVERLAP_CHARS = OVERLAP_TOKENS * CHARS_PER_TOKEN; // 400

// Heuristic: lines that look like section headings (short, possibly numbered)
const HEADING_RE = /^(?:#{1,6}\s+.{3,}|(?:\d+\.)+\s+[A-Z].{2,}|[A-Z][A-Z\s]{4,}:?\s*)$/;
// PDF page-break markers inserted by the pdf-parse library
const PAGE_BREAK_RE = /\f|\x0c/g;

interface ParsedLine {
  text: string;
  isHeading: boolean;
  page: number;
}

/**
 * Parse raw document text into structured lines, tracking page numbers
 * (using form-feed characters as page separators).
 */
function parseLines(rawText: string): ParsedLine[] {
  const lines: ParsedLine[] = [];
  let currentPage = 1;
  for (const rawLine of rawText.split('\n')) {
    // Count embedded form-feeds as page advances
    const formFeeds = (rawLine.match(PAGE_BREAK_RE) ?? []).length;
    const text = rawLine.replace(PAGE_BREAK_RE, '').trim();
    if (formFeeds > 0) currentPage += formFeeds;
    if (!text) continue;
    lines.push({
      text,
      isHeading: HEADING_RE.test(text) && text.length < 120,
      page: currentPage,
    });
  }
  return lines;
}

/**
 * Chunk parsed lines into overlapping windows.
 */
export function chunkDocument(rawText: string): TextChunk[] {
  const lines = parseLines(rawText);
  if (lines.length === 0) return [];

  const chunks: TextChunk[] = [];
  let chunkStart = 0;
  let chunkIndex = 0;

  while (chunkStart < lines.length) {
    let charCount = 0;
    let end = chunkStart;
    let sectionHeader: string | null = null;

    // Walk forward until we hit the char target
    while (end < lines.length && charCount < TARGET_CHARS) {
      const line = lines[end];
      if (line.isHeading && end > chunkStart) {
        // If we've accumulated a reasonable amount, break before the new section
        if (charCount > TARGET_CHARS * 0.4) break;
        sectionHeader = line.text;
      }
      if (!sectionHeader && line.isHeading) sectionHeader = line.text;
      charCount += line.text.length + 1;
      end++;
    }

    // Never produce an empty chunk
    if (end === chunkStart) end = Math.min(chunkStart + 1, lines.length);

    const chunkLines = lines.slice(chunkStart, end);
    const chunkText = chunkLines.map(l => l.text).join('\n').trim();

    if (chunkText) {
      chunks.push({
        chunk_index: chunkIndex++,
        chunk_text: chunkText,
        token_count: Math.ceil(chunkText.length / CHARS_PER_TOKEN),
        page_number: chunkLines[0]?.page ?? null,
        section_header: sectionHeader,
      });
    }

    // Overlap: step back OVERLAP_CHARS worth of characters
    let overlapChars = 0;
    let overlapStart = end;
    while (overlapStart > chunkStart + 1 && overlapChars < OVERLAP_CHARS) {
      overlapStart--;
      overlapChars += lines[overlapStart].text.length + 1;
    }
    chunkStart = overlapStart;
  }

  return chunks;
}
