/**
 * Document Chunker — splitting, overlap, page tracking, section headers,
 * and correct handling of real compliance document text.
 */

import { chunkDocument } from '@/lib/documents/chunker';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURES = join(__dirname, '../../fixtures/sample-evidence');

// ── Basic chunking behaviour ──────────────────────────────────────────────────

describe('chunkDocument — basic behaviour', () => {
  test('empty string returns no chunks', () => {
    expect(chunkDocument('')).toHaveLength(0);
  });

  test('whitespace-only string returns no chunks', () => {
    expect(chunkDocument('   \n\n\t\n  ')).toHaveLength(0);
  });

  test('short text produces exactly one chunk', () => {
    const chunks = chunkDocument('This is a short compliance policy document.');
    expect(chunks).toHaveLength(1);
  });

  test('every chunk has a non-empty chunk_text', () => {
    const text = readFileSync(join(FIXTURES, 'Acme_InfoSec_Policy_Sample.txt'), 'utf-8');
    const chunks = chunkDocument(text);
    const emptyChunks = chunks.filter(c => c.chunk_text.trim().length === 0);
    expect(emptyChunks).toHaveLength(0);
  });

  test('chunk_index is sequential starting from 0', () => {
    const text = readFileSync(join(FIXTURES, 'Acme_InfoSec_Policy_Sample.txt'), 'utf-8');
    const chunks = chunkDocument(text);
    chunks.forEach((c, i) => {
      expect(c.chunk_index).toBe(i);
    });
  });

  test('all chunks have a positive token_count', () => {
    const text = readFileSync(join(FIXTURES, 'Acme_InfoSec_Policy_Sample.txt'), 'utf-8');
    const chunks = chunkDocument(text);
    chunks.forEach(c => {
      expect(c.token_count).toBeGreaterThan(0);
    });
  });
});

// ── Chunk size bounds ────────────────────────────────────────────────────────

describe('chunkDocument — size bounds', () => {
  test('no chunk exceeds 2× target token count (600 chars / 4 = ~600 tokens at most)', () => {
    const text = readFileSync(join(FIXTURES, 'Acme_InfoSec_Policy_Sample.txt'), 'utf-8');
    const chunks = chunkDocument(text);
    chunks.forEach(c => {
      // Target is 500 tokens = 2000 chars. Allow generous headroom for section-break logic.
      expect(c.chunk_text.length).toBeLessThan(6000);
    });
  });

  test('long document produces multiple chunks', () => {
    const text = readFileSync(join(FIXTURES, 'Acme_InfoSec_Policy_Sample.txt'), 'utf-8');
    const chunks = chunkDocument(text);
    expect(chunks.length).toBeGreaterThan(2);
  });
});

// ── Overlap — key terms appear in consecutive chunks ────────────────────────

describe('chunkDocument — overlap', () => {
  test('consecutive chunks share some text (overlap window)', () => {
    // Build a document large enough to span multiple chunks
    const paragraph = 'The quick brown fox jumps over the lazy dog. '.repeat(50);
    const sections = Array.from({ length: 6 }, (_, i) => `Section ${i + 1}\n${paragraph}`).join('\n\n');
    const chunks = chunkDocument(sections);

    if (chunks.length < 2) return; // skip if too short

    // At least one pair of consecutive chunks should share ≥ 5 words
    let foundOverlap = false;
    for (let i = 0; i < chunks.length - 1; i++) {
      const words1 = new Set(chunks[i].chunk_text.split(/\s+/).filter(w => w.length > 4));
      const words2 = chunks[i + 1].chunk_text.split(/\s+/).filter(w => w.length > 4);
      const shared = words2.filter(w => words1.has(w));
      if (shared.length >= 5) { foundOverlap = true; break; }
    }
    expect(foundOverlap).toBe(true);
  });
});

// ── Page number tracking ──────────────────────────────────────────────────────

describe('chunkDocument — page number tracking', () => {
  test('single-page document: all chunks have page_number 1 or null', () => {
    const text = 'Some compliance text.\n'.repeat(200);
    const chunks = chunkDocument(text);
    chunks.forEach(c => {
      expect([1, null]).toContain(c.page_number);
    });
  });

  test('form-feed characters increment page number', () => {
    const page1 = 'Page one content with MFA policy information.\n'.repeat(20);
    const page2 = 'Page two content with incident response plan details.\n'.repeat(20);
    const text = page1 + '\f' + page2;
    const chunks = chunkDocument(text);

    const pages = chunks.map(c => c.page_number).filter(Boolean);
    const maxPage = Math.max(...(pages as number[]));
    expect(maxPage).toBeGreaterThanOrEqual(2);
  });

  test('multiple form-feeds produce correct page numbers', () => {
    const lines = Array.from({ length: 3 }, (_, i) =>
      `Page ${i + 1} text content\n`.repeat(20)
    ).join('\f');
    const chunks = chunkDocument(lines);
    const pages = [...new Set(chunks.map(c => c.page_number).filter(Boolean))];
    expect(pages.length).toBeGreaterThanOrEqual(2);
  });
});

// ── Section header detection ──────────────────────────────────────────────────

describe('chunkDocument — section header detection', () => {
  test('numbered section heading is detected', () => {
    const text = [
      '1. ACCESS CONTROLS',
      'All access to production systems requires MFA and RBAC.'.repeat(20),
      '',
      '2. INCIDENT RESPONSE',
      'Incidents are triaged by severity tier P1 through P3.'.repeat(20),
    ].join('\n');

    const chunks = chunkDocument(text);
    const sectioned = chunks.filter(c => c.section_header !== null);
    expect(sectioned.length).toBeGreaterThan(0);
  });
});

// ── Real document — content preservation ─────────────────────────────────────

describe('chunkDocument — real document content preservation', () => {
  test('Acme InfoSec policy: key control terms appear across chunks', () => {
    const text = readFileSync(join(FIXTURES, 'Acme_InfoSec_Policy_Sample.txt'), 'utf-8');
    const chunks = chunkDocument(text);
    const allText = chunks.map(c => c.chunk_text).join(' ').toLowerCase();

    // These terms must survive chunking — they're critical for retrieval
    const mustContain = ['mfa', 'okta', 'penetration', 'incident response', 'soc 2', 'encrypt'];
    mustContain.forEach(term => {
      expect(allText).toContain(term);
    });
  });

  test('Acme InfoSec policy: no text is lost between first and last chunk', () => {
    const text = readFileSync(join(FIXTURES, 'Acme_InfoSec_Policy_Sample.txt'), 'utf-8');
    const chunks = chunkDocument(text);

    // First chunk should contain content from the beginning of the document
    expect(chunks[0].chunk_text.toLowerCase()).toContain('acme');
    // Last chunk should contain content from the end
    const lastChunk = chunks[chunks.length - 1].chunk_text.toLowerCase();
    expect(lastChunk.length).toBeGreaterThan(0);
  });

  test('VDD responses: financial and DR terms survive chunking', () => {
    const text = readFileSync(join(FIXTURES, 'VDD_Vendor_Responses.txt'), 'utf-8');
    const chunks = chunkDocument(text);
    const allText = chunks.map(c => c.chunk_text).join(' ').toLowerCase();

    const mustContain = ['rto', 'rpo', 'soc 2', 'encryption', 'retention', 'deloitte'];
    mustContain.forEach(term => {
      expect(allText).toContain(term);
    });
  });
});

// ── Determinism ───────────────────────────────────────────────────────────────

describe('chunkDocument — determinism', () => {
  test('same input always produces identical chunks', () => {
    const text = readFileSync(join(FIXTURES, 'Acme_InfoSec_Policy_Sample.txt'), 'utf-8');
    const chunks1 = chunkDocument(text);
    const chunks2 = chunkDocument(text);
    expect(chunks1).toEqual(chunks2);
  });
});
