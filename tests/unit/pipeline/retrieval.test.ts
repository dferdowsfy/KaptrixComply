/**
 * BM25/TF-IDF Retrieval — term extraction, scoring, ranking.
 *
 * The retrieval functions are not exported directly, so we test the
 * observable contract: given chunks that match a question's key terms,
 * the most relevant chunk must score higher than an unrelated chunk.
 *
 * We also extract and test the pure scoring functions by replicating
 * the exact logic from src/lib/documents/retrieval.ts.
 */

import { chunkDocument } from '@/lib/documents/chunker';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURES = join(__dirname, '../../fixtures/sample-evidence');

// ── Replicated pure functions (mirrors retrieval.ts exactly) ─────────────────

const STOP_WORDS = new Set([
  'a','an','the','is','are','was','were','do','does','did','have','has','had',
  'be','been','being','will','would','could','should','may','might','shall',
  'you','we','they','it','i','your','our','their','its','my',
  'in','on','at','to','for','of','and','or','not','with','from','by',
  'as','that','this','these','those','any','all','if','whether','how',
  'what','which','when','where','who',
]);

function extractKeyTerms(question: string): string[] {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w))
    .slice(0, 15);
}

function scoreTfIdf(text: string, terms: string[]): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const term of terms) {
    let pos = 0;
    let count = 0;
    while ((pos = lower.indexOf(term, pos)) !== -1) { count++; pos += term.length; }
    if (count > 0) score += count * (1 + Math.log(term.length));
  }
  const norm = Math.log(text.length + 1);
  return norm > 0 ? score / norm : 0;
}

function rankChunks(chunks: { chunk_text: string }[], terms: string[]) {
  return chunks
    .map(c => ({ ...c, relevance: scoreTfIdf(c.chunk_text, terms) }))
    .sort((a, b) => b.relevance - a.relevance);
}

// ── Term extraction ───────────────────────────────────────────────────────────

describe('Retrieval — key term extraction', () => {
  test('removes stop words', () => {
    const terms = extractKeyTerms('Does your organization have a documented MFA policy?');
    const stopWordsInResult = terms.filter(t => STOP_WORDS.has(t));
    expect(stopWordsInResult).toHaveLength(0);
  });

  test('keeps compliance-relevant terms', () => {
    const terms = extractKeyTerms('Does your organization have a documented MFA policy?');
    expect(terms).toContain('documented');
    expect(terms).toContain('mfa');
    expect(terms).toContain('policy');
  });

  test('filters out very short words (≤2 chars)', () => {
    const terms = extractKeyTerms('Is MFA enabled on all systems?');
    terms.forEach(t => expect(t.length).toBeGreaterThan(2));
  });

  test('caps result at 15 terms', () => {
    const longQuestion = 'penetration testing vulnerability assessment incident response disaster recovery encryption authentication authorization access control monitoring logging audit governance compliance security policy procedure';
    const terms = extractKeyTerms(longQuestion);
    expect(terms.length).toBeLessThanOrEqual(15);
  });

  test('lowercases all terms', () => {
    const terms = extractKeyTerms('MFA Authentication ACCESS CONTROLS');
    terms.forEach(t => expect(t).toBe(t.toLowerCase()));
  });

  test('empty question returns empty array', () => {
    expect(extractKeyTerms('')).toHaveLength(0);
  });

  test('question with only stop words returns empty array', () => {
    expect(extractKeyTerms('is the a an to for')).toHaveLength(0);
  });
});

// ── TF-IDF scoring ────────────────────────────────────────────────────────────

describe('Retrieval — TF-IDF scoring', () => {
  test('text containing the query terms scores higher than unrelated text', () => {
    const terms = extractKeyTerms('multi-factor authentication MFA policy');
    const relevant = 'MFA is required for all administrative accounts. Multi-factor authentication is enforced via Duo Security for all VPN and privileged access.';
    const irrelevant = 'The company offers quarterly financial reviews and maintains a board-approved budget allocation process.';

    expect(scoreTfIdf(relevant, terms)).toBeGreaterThan(scoreTfIdf(irrelevant, terms));
  });

  test('text with more term occurrences scores higher', () => {
    const terms = extractKeyTerms('encryption key rotation');
    const high = 'Encryption keys are rotated annually. All encryption operations use AES-256. Key rotation is logged and encryption key management follows NIST guidelines.';
    const low = 'The system uses standard security practices including encryption.';

    expect(scoreTfIdf(high, terms)).toBeGreaterThan(scoreTfIdf(low, terms));
  });

  test('empty text scores 0', () => {
    expect(scoreTfIdf('', ['encryption', 'policy'])).toBe(0);
  });

  test('longer terms get higher weight per occurrence', () => {
    // "authentication" (14 chars) should score higher per hit than "auth" (4 chars)
    const longTerm = scoreTfIdf('authentication authentication', ['authentication']);
    const shortTerm = scoreTfIdf('auth auth', ['auth']);
    expect(longTerm).toBeGreaterThan(shortTerm);
  });

  test('score is normalized by text length (shorter text is not penalized for density)', () => {
    const terms = ['encryption'];
    const dense = 'encryption encryption encryption'; // 3 hits in short text
    const sparse = ('encryption ' + 'lorem ipsum '.repeat(100)); // 1 hit in long text
    expect(scoreTfIdf(dense, terms)).toBeGreaterThan(scoreTfIdf(sparse, terms));
  });
});

// ── Ranking against real document chunks ─────────────────────────────────────

describe('Retrieval — ranking against real document', () => {
  const acmeText = readFileSync(join(FIXTURES, 'Acme_InfoSec_Policy_Sample.txt'), 'utf-8');
  const acmeChunks = chunkDocument(acmeText);

  test('MFA question retrieves a chunk containing MFA/Duo content', () => {
    const terms = extractKeyTerms('Does your organization require multi-factor authentication for privileged accounts?');
    const ranked = rankChunks(acmeChunks, terms);
    const topChunk = ranked[0].chunk_text.toLowerCase();
    expect(topChunk).toMatch(/mfa|multi-factor|duo/);
  });

  test('penetration test question retrieves chunk containing pentest content', () => {
    const terms = extractKeyTerms('When was your most recent penetration test and who conducted it?');
    const ranked = rankChunks(acmeChunks, terms);
    const top3 = ranked.slice(0, 3).map(c => c.chunk_text.toLowerCase()).join(' ');
    expect(top3).toMatch(/penetration|pentest|ncc group/);
  });

  test('encryption question retrieves chunk containing encryption/AES content', () => {
    const terms = extractKeyTerms('How is customer data encrypted at rest and in transit?');
    const ranked = rankChunks(acmeChunks, terms);
    const top3 = ranked.slice(0, 3).map(c => c.chunk_text.toLowerCase()).join(' ');
    expect(top3).toMatch(/encrypt|aes|tls|kms/);
  });

  test('disaster recovery question retrieves chunk containing DR/RTO/RPO content', () => {
    const terms = extractKeyTerms('Describe your disaster recovery plan including RTO and RPO targets.');
    const ranked = rankChunks(acmeChunks, terms);
    const top3 = ranked.slice(0, 3).map(c => c.chunk_text.toLowerCase()).join(' ');
    expect(top3).toMatch(/rto|rpo|disaster recovery|bcp/);
  });

  test('unrelated question (about payroll) scores near-zero on all chunks', () => {
    const terms = extractKeyTerms('What is the payroll processing schedule for hourly employees?');
    const ranked = rankChunks(acmeChunks, terms);
    // Top result should still have low absolute score since document has no payroll content
    expect(ranked[0].relevance).toBeLessThan(1.0);
  });

  test('VDD responses: financial question retrieves financial content', () => {
    const vddText = readFileSync(join(FIXTURES, 'VDD_Vendor_Responses.txt'), 'utf-8');
    const chunks = chunkDocument(vddText);
    const terms = extractKeyTerms('What is your current cash runway and burn rate?');
    const ranked = rankChunks(chunks, terms);
    const top3 = ranked.slice(0, 3).map(c => c.chunk_text.toLowerCase()).join(' ');
    expect(top3).toMatch(/runway|burn rate|cash|series/);
  });
});

// ── Ranking consistency ───────────────────────────────────────────────────────

describe('Retrieval — ranking consistency', () => {
  test('top-ranked chunk is always the most relevant one', () => {
    const chunks = [
      { chunk_text: 'MFA is required for all accounts. Multi-factor authentication using Duo.' },
      { chunk_text: 'Financial statements are audited annually by Deloitte.' },
      { chunk_text: 'Multi-factor authentication must be enforced on all privileged and VPN access per MFA policy.' },
    ];
    const terms = extractKeyTerms('multi-factor authentication MFA policy privileged accounts');
    const ranked = rankChunks(chunks, terms);
    // Chunk 3 (index 2) has the most MFA mentions — should rank highest
    expect(ranked[0].chunk_text).toContain('Multi-factor authentication must be enforced');
  });

  test('identical chunks produce identical scores', () => {
    const chunks = [
      { chunk_text: 'Access controls are enforced via RBAC and MFA.' },
      { chunk_text: 'Access controls are enforced via RBAC and MFA.' },
    ];
    const terms = extractKeyTerms('access controls MFA');
    const ranked = rankChunks(chunks, terms);
    expect(ranked[0].relevance).toBe(ranked[1].relevance);
  });
});
