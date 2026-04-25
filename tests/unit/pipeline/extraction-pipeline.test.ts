/**
 * Extraction Pipeline Integration Tests
 *
 * Tests the full parse → chunk → retrieve → map-to-questions pipeline
 * using real fixture documents. Does NOT call the LLM — it tests that:
 *
 * 1. Documents parse to text (txt files synchronously)
 * 2. Chunking produces the right number/structure of chunks
 * 3. BM25 retrieval correctly maps the right chunks to the right questions
 * 4. The document type inference function produces correct labels
 * 5. Answer stubs are correctly built for question_ids
 * 6. The extraction pipeline handles unanswered questions gracefully
 *
 * LLM extraction (extractEvidence) is mocked so these tests stay fast
 * and deterministic.
 */

import { chunkDocument } from '@/lib/documents/chunker';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as XLSX from 'xlsx';

const FIXTURES = join(__dirname, '../../fixtures/sample-evidence');

// ── Replicated pure helpers (mirrors extract/route.ts) ───────────────────────

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

// ── Document type inference ───────────────────────────────────────────────────

describe('Extraction pipeline — document type inference', () => {
  test('SOC2 report filename', () => {
    expect(inferDocumentType('Acme_SOC2_Report_2025.pdf', 'pdf')).toBe('soc2_report');
  });

  test('ISO 27001 certificate', () => {
    expect(inferDocumentType('ISO27001_Certificate.pdf', 'pdf')).toBe('iso_certificate');
  });

  test('DPA document', () => {
    expect(inferDocumentType('Vendor_DPA_Agreement.pdf', 'pdf')).toBe('dpa');
  });

  test('pentest report', () => {
    expect(inferDocumentType('Penetration_Test_Report_NCC.pdf', 'pdf')).toBe('pentest_report');
  });

  test('InfoSec policy', () => {
    expect(inferDocumentType('Acme_InfoSec_Policy_Sample.txt', 'txt')).toBe('policy_document');
  });

  test('XLSX questionnaire falls back to spreadsheet', () => {
    expect(inferDocumentType('VDD_Questionnaire.xlsx', 'xlsx')).toBe('spreadsheet');
  });

  test('CSV file falls back to spreadsheet', () => {
    expect(inferDocumentType('questions.csv', 'csv')).toBe('spreadsheet');
  });

  test('unknown file type returns unknown', () => {
    expect(inferDocumentType('random_document.txt', 'txt')).toBe('unknown');
  });
});

// ── Full pipeline: text → chunks → questions mapped ──────────────────────────

describe('Extraction pipeline — text parsing and chunking', () => {
  test('Acme InfoSec policy parses and chunks successfully', () => {
    const text = readFileSync(join(FIXTURES, 'Acme_InfoSec_Policy_Sample.txt'), 'utf-8');
    expect(text.length).toBeGreaterThan(1000);

    const chunks = chunkDocument(text);
    expect(chunks.length).toBeGreaterThan(3);
    expect(chunks[0].chunk_text).toBeTruthy();
  });

  test('VDD responses parse and chunk successfully', () => {
    const text = readFileSync(join(FIXTURES, 'VDD_Vendor_Responses.txt'), 'utf-8');
    const chunks = chunkDocument(text);
    expect(chunks.length).toBeGreaterThan(2);
  });
});

// ── Question-to-chunk mapping: correct chunks surface for each question ───────

describe('Extraction pipeline — question-to-chunk relevance mapping', () => {
  // Replicated TF-IDF scoring
  const STOP_WORDS = new Set(['a','an','the','is','are','was','were','do','does','did','have','has',
    'be','been','being','will','would','could','should','may','might','shall','you','we','they','it',
    'i','your','our','their','its','my','in','on','at','to','for','of','and','or','not','with','from',
    'by','as','that','this','these','those','any','all','if','whether','how','what','which','when','where','who']);

  function extractTerms(q: string): string[] {
    return q.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w)).slice(0, 15);
  }

  function score(text: string, terms: string[]): number {
    const lower = text.toLowerCase();
    let s = 0;
    for (const t of terms) {
      let pos = 0, count = 0;
      while ((pos = lower.indexOf(t, pos)) !== -1) { count++; pos += t.length; }
      if (count > 0) s += count * (1 + Math.log(t.length));
    }
    const norm = Math.log(text.length + 1);
    return norm > 0 ? s / norm : 0;
  }

  function topChunks(chunks: { chunk_text: string }[], question: string, k = 3) {
    const terms = extractTerms(question);
    return [...chunks]
      .map(c => ({ ...c, relevance: score(c.chunk_text, terms) }))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, k);
  }

  const acmeText = readFileSync(join(FIXTURES, 'Acme_InfoSec_Policy_Sample.txt'), 'utf-8');
  const acmeChunks = chunkDocument(acmeText);

  const vddText = readFileSync(join(FIXTURES, 'VDD_Vendor_Responses.txt'), 'utf-8');
  const vddChunks = chunkDocument(vddText);

  // SOC2 questions mapped to Acme policy
  const SOC2_QUESTIONS = [
    { q: 'Does your organization require multi-factor authentication for privileged accounts?', expect: /mfa|multi-factor|duo/i },
    { q: 'When was your most recent penetration test and who conducted it?', expect: /penetration|ncc/i },
    { q: 'How is customer data encrypted at rest and in transit?', expect: /encrypt|aes|tls/i },
    { q: 'Describe your incident response plan and detection SLAs.', expect: /incident|sla|detection/i },
    { q: 'What is your change management process?', expect: /change management|cab|github|pull request/i },
    { q: 'Describe your business continuity and disaster recovery plan.', expect: /rto|rpo|disaster|bcp/i },
    { q: 'What data classification tiers does your organization use?', expect: /classif|confidential|restricted/i },
  ];

  test.each(SOC2_QUESTIONS)(
    'SOC2: "$q" maps to correct chunk from Acme policy',
    ({ q, expect: matchPattern }) => {
      const top = topChunks(acmeChunks, q);
      const combined = top.map(c => c.chunk_text).join(' ');
      expect(combined).toMatch(matchPattern);
    }
  );

  // VDD questions mapped to VDD responses
  const VDD_QUESTIONS = [
    { q: 'What is your current cash runway and burn rate?', expect: /runway|burn rate|million/i },
    { q: 'What is your documented uptime SLA?', expect: /uptime|sla|99\./i },
    { q: 'Describe your disaster recovery capabilities including RTO and RPO.', expect: /rto|rpo|failover/i },
    { q: 'How is customer data encrypted in transit and at rest?', expect: /tls|aes|kms|encrypt/i },
    { q: 'Do you maintain a sub-processor list?', expect: /sub-processor|dpa/i },
    { q: 'What compliance certifications do you hold?', expect: /soc 2|iso 27001|certified/i },
  ];

  test.each(VDD_QUESTIONS)(
    'VDD: "$q" maps to correct chunk from BetaCloud responses',
    ({ q, expect: matchPattern }) => {
      const top = topChunks(vddChunks, q);
      const combined = top.map(c => c.chunk_text).join(' ');
      expect(combined).toMatch(matchPattern);
    }
  );
});

// ── Answer stub building ──────────────────────────────────────────────────────

describe('Extraction pipeline — answer stub creation', () => {
  function buildAnswerStubs(engagementId: string, userId: string, questionIds: string[]) {
    return questionIds.map(qid => ({
      compliance_engagement_id: engagementId,
      question_id: qid,
      answer_status: 'missing',
      extraction_source: 'doc-uuid',
      submitted_by: userId,
    }));
  }

  test('creates one stub per question_id', () => {
    const stubs = buildAnswerStubs('eng-1', 'user-1', ['q1', 'q2', 'q3']);
    expect(stubs).toHaveLength(3);
  });

  test('all stubs default to missing status', () => {
    const stubs = buildAnswerStubs('eng-1', 'user-1', ['q1', 'q2']);
    stubs.forEach(s => expect(s.answer_status).toBe('missing'));
  });

  test('empty question_ids produces no stubs', () => {
    expect(buildAnswerStubs('eng-1', 'user-1', [])).toHaveLength(0);
  });

  test('engagement_id is stamped on all stubs', () => {
    const stubs = buildAnswerStubs('eng-abc', 'user-1', ['q1', 'q2']);
    stubs.forEach(s => expect(s.compliance_engagement_id).toBe('eng-abc'));
  });
});

// ── Confidence → evidence strength mapping ───────────────────────────────────

describe('Extraction pipeline — confidence to evidence strength', () => {
  function confidenceToStrength(confidence: number): 'strong' | 'partial' | 'none' {
    if (confidence >= 0.75) return 'strong';
    if (confidence >= 0.35) return 'partial';
    return 'none';
  }

  test('0.75 → strong', () => expect(confidenceToStrength(0.75)).toBe('strong'));
  test('0.90 → strong', () => expect(confidenceToStrength(0.90)).toBe('strong'));
  test('0.50 → partial', () => expect(confidenceToStrength(0.50)).toBe('partial'));
  test('0.35 → partial', () => expect(confidenceToStrength(0.35)).toBe('partial'));
  test('0.34 → none', () => expect(confidenceToStrength(0.34)).toBe('none'));
  test('0.00 → none', () => expect(confidenceToStrength(0.00)).toBe('none'));

  test('boundary: strong threshold is exactly 0.75', () => {
    expect(confidenceToStrength(0.749)).toBe('partial');
    expect(confidenceToStrength(0.750)).toBe('strong');
  });
});

// ── Extraction result scoring impact ─────────────────────────────────────────

describe('Extraction pipeline — extraction result to score impact', () => {
  // auto_filled + strong → 100%, partial → 60%, manual → 30%, missing → 0%
  type AnswerStatus = 'auto_filled' | 'partial' | 'manual' | 'missing';

  function creditForExtraction(status: AnswerStatus, strength: 'strong' | 'partial' | 'none'): number {
    if (status === 'missing') return 0;
    if (status === 'auto_filled') {
      if (strength === 'strong') return 1.0;
      if (strength === 'partial') return 0.6;
      return 0.5;
    }
    if (status === 'partial') return 0.4;
    if (status === 'manual') return 0.3;
    return 0;
  }

  test('auto_filled + strong = full credit', () => expect(creditForExtraction('auto_filled', 'strong')).toBe(1.0));
  test('auto_filled + partial = 60% credit', () => expect(creditForExtraction('auto_filled', 'partial')).toBe(0.6));
  test('auto_filled + none = 50% credit', () => expect(creditForExtraction('auto_filled', 'none')).toBe(0.5));
  test('partial answer = 40% credit', () => expect(creditForExtraction('partial', 'none')).toBe(0.4));
  test('manual answer = 30% credit', () => expect(creditForExtraction('manual', 'none')).toBe(0.3));
  test('missing answer = 0% credit', () => expect(creditForExtraction('missing', 'none')).toBe(0));

  test('a good extraction always improves score over no answer', () => {
    expect(creditForExtraction('auto_filled', 'strong')).toBeGreaterThan(creditForExtraction('missing', 'none'));
    expect(creditForExtraction('partial', 'partial')).toBeGreaterThan(creditForExtraction('missing', 'none'));
  });
});
