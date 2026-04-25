/**
 * Upload Validator — MIME, magic bytes, extension allowlist, size checks.
 * Tests the complete defense chain before a byte touches Supabase Storage.
 */

import { validateUpload, buildStoragePath } from '@/lib/security/upload-validator';
import { UPLOAD_LIMITS } from '@/lib/constants';

// ── Magic byte helpers ────────────────────────────────────────────────────────

function pdfHeader(): Buffer {
  // %PDF magic bytes
  return Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x0a, 0x0a, 0x0a, 0x0a, 0x0a, 0x0a, 0x0a]);
}

function zipHeader(): Buffer {
  // PK\x03\x04 — all Office Open XML formats (docx/xlsx/pptx)
  return Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
}

function pngHeader(): Buffer {
  return Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x00, 0x00, 0x00, 0x00]);
}

function exeHeader(): Buffer {
  // MZ — Windows PE
  return Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00]);
}

function textBytes(content = 'hello world'): Buffer {
  return Buffer.from(content, 'utf-8').subarray(0, 16);
}

// ── Valid file types ──────────────────────────────────────────────────────────

describe('Upload validator — valid files', () => {
  test('valid PDF with correct magic bytes is accepted', () => {
    const result = validateUpload({
      filename: 'SOC2_Report.pdf',
      declaredMime: 'application/pdf',
      size: 50_000,
      headBytes: pdfHeader(),
    });
    expect(result.ok).toBe(true);
    expect(result.effectiveMime).toBe('application/pdf');
  });

  test('valid DOCX with ZIP magic bytes is accepted', () => {
    const result = validateUpload({
      filename: 'Policy.docx',
      declaredMime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 20_000,
      headBytes: zipHeader(),
    });
    expect(result.ok).toBe(true);
  });

  test('valid XLSX with ZIP magic bytes is accepted', () => {
    const result = validateUpload({
      filename: 'Questions.xlsx',
      declaredMime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: 15_000,
      headBytes: zipHeader(),
    });
    expect(result.ok).toBe(true);
  });

  test('valid PNG with correct magic bytes is accepted', () => {
    const result = validateUpload({
      filename: 'Architecture.png',
      declaredMime: 'image/png',
      size: 800_000,
      headBytes: pngHeader(),
    });
    expect(result.ok).toBe(true);
  });

  test('valid TXT (no magic bytes required) is accepted', () => {
    const result = validateUpload({
      filename: 'policy.txt',
      declaredMime: 'text/plain',
      size: 5_000,
      headBytes: textBytes(),
    });
    expect(result.ok).toBe(true);
  });

  test('valid CSV is accepted', () => {
    const result = validateUpload({
      filename: 'questions.csv',
      declaredMime: 'text/csv',
      size: 3_000,
      headBytes: textBytes('question_text,control_category'),
    });
    expect(result.ok).toBe(true);
  });

  test('browser sending application/octet-stream falls back to extension MIME', () => {
    const result = validateUpload({
      filename: 'report.pdf',
      declaredMime: 'application/octet-stream',
      size: 10_000,
      headBytes: pdfHeader(),
    });
    expect(result.ok).toBe(true);
    expect(result.effectiveMime).toBe('application/pdf');
  });
});

// ── Blocked file types ────────────────────────────────────────────────────────

describe('Upload validator — blocked files', () => {
  test('EXE file is rejected', () => {
    const result = validateUpload({
      filename: 'malware.exe',
      declaredMime: 'application/octet-stream',
      size: 100_000,
      headBytes: exeHeader(),
    });
    expect(result.ok).toBe(false);
  });

  test('no extension is rejected', () => {
    const result = validateUpload({
      filename: 'noextension',
      declaredMime: 'application/pdf',
      size: 10_000,
      headBytes: pdfHeader(),
    });
    expect(result.ok).toBe(false);
  });

  test('.js file is rejected', () => {
    const result = validateUpload({
      filename: 'script.js',
      declaredMime: 'text/javascript',
      size: 1_000,
      headBytes: textBytes('const x = 1'),
    });
    expect(result.ok).toBe(false);
  });

  test('.php file is rejected', () => {
    const result = validateUpload({
      filename: 'shell.php',
      declaredMime: 'application/x-httpd-php',
      size: 500,
      headBytes: textBytes('<?php'),
    });
    expect(result.ok).toBe(false);
  });

  test('PDF with wrong magic bytes (EXE content) is rejected', () => {
    const result = validateUpload({
      filename: 'disguised.pdf',
      declaredMime: 'application/pdf',
      size: 100_000,
      headBytes: exeHeader(),
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/magic-byte/i);
  });

  test('PNG with PDF magic bytes is rejected', () => {
    const result = validateUpload({
      filename: 'fake.png',
      declaredMime: 'image/png',
      size: 50_000,
      headBytes: pdfHeader(),
    });
    expect(result.ok).toBe(false);
  });

  test('empty file (size 0) is rejected', () => {
    const result = validateUpload({
      filename: 'empty.pdf',
      declaredMime: 'application/pdf',
      size: 0,
      headBytes: Buffer.alloc(16),
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/empty/i);
  });

  test('file exceeding max size is rejected', () => {
    const result = validateUpload({
      filename: 'huge.pdf',
      declaredMime: 'application/pdf',
      size: UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES + 1,
      headBytes: pdfHeader(),
    });
    expect(result.ok).toBe(false);
  });
});

// ── Allowlist integrity ───────────────────────────────────────────────────────

describe('Upload validator — MIME allowlist', () => {
  test('allowlist contains all expected document types', () => {
    const required = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
      'image/png',
      'image/jpeg',
    ];
    required.forEach(mime => {
      expect(UPLOAD_LIMITS.ALLOWED_MIME_TYPES).toContain(mime as never);
    });
  });

  test('allowlist does not contain dangerous types', () => {
    const dangerous = ['text/javascript', 'application/x-httpd-php', 'application/x-sh', 'application/x-executable'];
    dangerous.forEach(mime => {
      expect(UPLOAD_LIMITS.ALLOWED_MIME_TYPES).not.toContain(mime as never);
    });
  });

  test('max file size is at least 10MB', () => {
    expect(UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES).toBeGreaterThanOrEqual(10 * 1024 * 1024);
  });
});

// ── Storage path builder ──────────────────────────────────────────────────────

describe('buildStoragePath', () => {
  test('produces scoped path under engagements/', () => {
    const path = buildStoragePath({ engagementId: 'eng-123', documentId: 'doc-456', extension: 'pdf' });
    expect(path).toMatch(/^engagements\//);
    expect(path).toContain('eng-123');
    expect(path).toContain('doc-456');
    expect(path).toMatch(/\.pdf$/);
  });

  test('strips path traversal characters from engagementId', () => {
    const path = buildStoragePath({ engagementId: '../../../etc', documentId: 'doc-1', extension: 'pdf' });
    expect(path).not.toContain('..');
    // The function strips non-alphanumeric chars (including the dots and slashes),
    // leaving only 'etc' as the safe remainder — verify no ../ traversal sequences remain
    expect(path).not.toMatch(/\.\.\//);
  });

  test('strips path traversal from documentId', () => {
    const path = buildStoragePath({ engagementId: 'eng-1', documentId: '../../secret', extension: 'pdf' });
    expect(path).not.toContain('..');
  });

  test('lowercases extension', () => {
    const path = buildStoragePath({ engagementId: 'eng-1', documentId: 'doc-1', extension: 'PDF' });
    expect(path).toMatch(/\.pdf$/);
  });

  test('strips non-alphanumeric from extension', () => {
    const path = buildStoragePath({ engagementId: 'eng-1', documentId: 'doc-1', extension: 'p;df' });
    expect(path).not.toContain(';');
  });
});
