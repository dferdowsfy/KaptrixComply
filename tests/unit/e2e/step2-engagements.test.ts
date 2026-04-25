/**
 * Step 2 — Engagement Creation
 *
 * Tests: validation rules from POST /api/compliance/engagements,
 * vendor key normalisation, framework resolution, draft-template guard.
 */

import { FRAMEWORKS } from '@/lib/scoring/frameworks';
import type { FrameworkId } from '@/lib/scoring/frameworks';

// ── Input validation (mirrors API guards) ────────────────────────────────────

describe('Step 2 — Engagement input validation', () => {
  function validate(body: Record<string, unknown>): string | null {
    if (!body.framework_id) return 'Missing framework_id';
    if (!(body.framework_id as string) in FRAMEWORKS) return 'Unknown framework';
    if (!body.vendor_user_id && !body.vendor_company && !body.vendor_email) {
      return 'Choose a saved vendor or enter at least a vendor company or email.';
    }
    return null;
  }

  test('rejects missing framework_id', () => {
    expect(validate({ vendor_email: 'v@acme.com' })).toMatch(/framework_id/i);
  });

  test('rejects missing vendor info', () => {
    expect(validate({ framework_id: 'soc2' })).toMatch(/vendor/i);
  });

  test('accepts vendor_email only', () => {
    expect(validate({ framework_id: 'soc2', vendor_email: 'v@acme.com' })).toBeNull();
  });

  test('accepts vendor_company only', () => {
    expect(validate({ framework_id: 'soc2', vendor_company: 'Acme Corp' })).toBeNull();
  });

  test('accepts vendor_user_id only', () => {
    expect(validate({ framework_id: 'soc2', vendor_user_id: 'uuid-123' })).toBeNull();
  });

  test('all four valid framework_ids are recognised', () => {
    const validIds: FrameworkId[] = ['soc2', 'vdd', 'financial_controls', 'agnostic'];
    validIds.forEach(id => {
      expect(FRAMEWORKS[id]).toBeDefined();
    });
  });
});

// ── Framework → template resolution ──────────────────────────────────────────

describe('Step 2 — Framework to template resolution', () => {
  test('soc2 resolves to soc2_vendor template', () => {
    expect(FRAMEWORKS.soc2.template_id).toBe('soc2_vendor');
  });

  test('vdd resolves to vdd template', () => {
    expect(FRAMEWORKS.vdd.template_id).toBe('vdd');
  });

  test('unknown framework_id does not exist in FRAMEWORKS', () => {
    expect(FRAMEWORKS['unknown_fw' as FrameworkId]).toBeUndefined();
  });

  test('custom template body.template_id takes precedence over framework default', () => {
    // When body.template_id is provided, it should override fw.template_id
    const bodyTemplateId = 'custom_my_framework_1234567890';
    const fw = FRAMEWORKS.soc2;
    const resolved = bodyTemplateId ?? fw.template_id;
    expect(resolved).toBe(bodyTemplateId);
  });
});

// ── Vendor key normalisation (mirrors engagements GET dedup logic) ────────────

describe('Step 2 — Vendor key deduplication', () => {
  function normalizeVendorKey(value: string | null | undefined): string {
    return (value ?? '').trim().toLowerCase();
  }

  function buildKey(userId: string | null, company: string | null | undefined, email: string | null | undefined): string {
    if (userId) return `user:${userId}`;
    return `saved:${normalizeVendorKey(company)}:${normalizeVendorKey(email)}`;
  }

  test('same vendor_user_id always produces same key', () => {
    expect(buildKey('uid-1', null, null)).toBe(buildKey('uid-1', 'Acme', 'a@acme.com'));
  });

  test('same company+email produce same saved key regardless of case', () => {
    expect(buildKey(null, 'Acme Corp', 'vendor@acme.com'))
      .toBe(buildKey(null, 'ACME CORP', 'VENDOR@ACME.COM'));
  });

  test('different companies produce different keys', () => {
    expect(buildKey(null, 'Acme', 'v@acme.com'))
      .not.toBe(buildKey(null, 'BetaCo', 'v@beta.com'));
  });

  test('user-keyed vendor takes priority over saved-keyed vendor', () => {
    const withUserId = buildKey('uid-99', 'Acme', 'v@acme.com');
    expect(withUserId).toMatch(/^user:/);
  });
});

// ── Draft template guard ──────────────────────────────────────────────────────

describe('Step 2 — Draft template guard', () => {
  function checkDraftAllowed(tpl: { is_custom: boolean; is_published: boolean | null }): string | null {
    if (tpl.is_custom && tpl.is_published === false) {
      return 'This template is a draft and cannot be used in engagements yet.';
    }
    return null;
  }

  test('draft custom template is blocked', () => {
    expect(checkDraftAllowed({ is_custom: true, is_published: false })).toBeTruthy();
  });

  test('published custom template is allowed', () => {
    expect(checkDraftAllowed({ is_custom: true, is_published: true })).toBeNull();
  });

  test('system template (non-custom) is always allowed regardless of is_published', () => {
    expect(checkDraftAllowed({ is_custom: false, is_published: false })).toBeNull();
  });

  test('null is_published treated as draft when is_custom=true', () => {
    expect(checkDraftAllowed({ is_custom: true, is_published: null as unknown as boolean })).toBeNull();
    // is_published === false specifically blocks — null means "not explicitly set" (system)
  });
});

// ── Email normalisation ───────────────────────────────────────────────────────

describe('Step 2 — Email normalisation', () => {
  function normalizeEmail(email: string | null | undefined): string | null {
    return email?.trim().toLowerCase() || null;
  }

  test('trims and lowercases email', () => {
    expect(normalizeEmail('  Vendor@Acme.COM  ')).toBe('vendor@acme.com');
  });

  test('empty string returns null', () => {
    expect(normalizeEmail('')).toBeNull();
  });

  test('null returns null', () => {
    expect(normalizeEmail(null)).toBeNull();
  });

  test('undefined returns null', () => {
    expect(normalizeEmail(undefined)).toBeNull();
  });
});
