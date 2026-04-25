/**
 * Step 7 — Remediation Plan Generation
 *
 * Tests: rule lookup, fallback template, action_type values,
 * title truncation, idempotency semantics.
 */

import { REMEDIATION_RULES, getRemediationTemplate } from '@/lib/remediation/rules';
import type { ActionType } from '@/lib/remediation/rules';

// ── Rule lookup ───────────────────────────────────────────────────────────────

describe('Step 7 — Remediation rule lookup', () => {
  test('known SOC2 control CC6.1 returns specific rule', () => {
    const tmpl = getRemediationTemplate('CC6.1');
    expect(tmpl.issue_description).toContain('access control');
    expect(tmpl.action_type).toBe('upload_document');
  });

  test('known SOC2 control CC7.2 returns pentest-specific rule', () => {
    const tmpl = getRemediationTemplate('CC7.2');
    expect(tmpl.next_action.toLowerCase()).toContain('pentest');
  });

  test('null controlId falls back to generic template', () => {
    const tmpl = getRemediationTemplate(null);
    expect(tmpl.issue_description).toContain('Required evidence');
  });

  test('undefined controlId falls back to generic template', () => {
    const tmpl = getRemediationTemplate(undefined);
    expect(tmpl.issue_description).toContain('Required evidence');
  });

  test('unknown controlId falls back to generic template', () => {
    const tmpl = getRemediationTemplate('NONEXISTENT-999');
    expect(tmpl.issue_description).toContain('Required evidence');
  });

  test('generic fallback action_type is upload_document', () => {
    expect(getRemediationTemplate(null).action_type).toBe('upload_document');
  });
});

// ── Rule completeness ─────────────────────────────────────────────────────────

describe('Step 7 — Rule completeness', () => {
  const VALID_ACTION_TYPES: ActionType[] = [
    'upload_document',
    'define_policy',
    'contact_vendor',
    'internal_review',
  ];

  test('every rule has a non-empty issue_description', () => {
    const bad = Object.entries(REMEDIATION_RULES).filter(([, rule]) => !rule.issue_description.trim());
    expect(bad.map(([id]) => id)).toHaveLength(0);
  });

  test('every rule has a non-empty next_action', () => {
    const bad = Object.entries(REMEDIATION_RULES).filter(([, rule]) => !rule.next_action.trim());
    expect(bad.map(([id]) => id)).toHaveLength(0);
  });

  test('every rule has a valid action_type', () => {
    const bad = Object.entries(REMEDIATION_RULES).filter(([, rule]) => !VALID_ACTION_TYPES.includes(rule.action_type));
    expect(bad.map(([id]) => id)).toHaveLength(0);
  });

  test('at least 10 rules are defined', () => {
    expect(Object.keys(REMEDIATION_RULES).length).toBeGreaterThanOrEqual(10);
  });
});

// ── Action title builder ──────────────────────────────────────────────────────

describe('Step 7 — Action title building', () => {
  function buildActionTitle(gapTitle: string): string {
    const truncated = gapTitle.length > 80 ? gapTitle.slice(0, 77) + '…' : gapTitle;
    return `Remediate: ${truncated}`;
  }

  test('short gap title is preserved in action title', () => {
    expect(buildActionTitle('No MFA evidence')).toBe('Remediate: No MFA evidence');
  });

  test('long gap title is truncated with ellipsis', () => {
    const long = 'a'.repeat(90);
    const title = buildActionTitle(long);
    expect(title.startsWith('Remediate: ')).toBe(true);
    expect(title.length).toBeLessThanOrEqual('Remediate: '.length + 80);
    expect(title).toContain('…');
  });

  test('action title always starts with "Remediate: "', () => {
    expect(buildActionTitle('some gap')).toMatch(/^Remediate: /);
  });
});

// ── Idempotency logic ─────────────────────────────────────────────────────────

describe('Step 7 — Remediation idempotency', () => {
  // The API deletes existing pending actions for a gap then re-inserts.
  // This test verifies the logic: running generate twice should not double-count.

  type Action = { gap_id: string; status: string };

  function generateActions(gapIds: string[], existing: Action[]): { toDelete: string[]; toInsert: string[] } {
    const toDelete = existing
      .filter(a => gapIds.includes(a.gap_id) && a.status === 'pending')
      .map(a => a.gap_id);
    const toInsert = gapIds; // one per gap, after deletion
    return { toDelete, toInsert };
  }

  test('no existing actions → all gaps get a new action', () => {
    const { toDelete, toInsert } = generateActions(['g1', 'g2', 'g3'], []);
    expect(toDelete).toHaveLength(0);
    expect(toInsert).toHaveLength(3);
  });

  test('existing pending action for a gap is deleted before re-insert', () => {
    const existing: Action[] = [{ gap_id: 'g1', status: 'pending' }];
    const { toDelete } = generateActions(['g1'], existing);
    expect(toDelete).toContain('g1');
  });

  test('existing in_progress action is not deleted', () => {
    const existing: Action[] = [{ gap_id: 'g1', status: 'in_progress' }];
    const { toDelete } = generateActions(['g1'], existing);
    expect(toDelete).not.toContain('g1');
  });

  test('re-running produce same number of insert operations', () => {
    const gapIds = ['g1', 'g2'];
    const run1 = generateActions(gapIds, []);
    const run2 = generateActions(gapIds, run1.toInsert.map(id => ({ gap_id: id, status: 'pending' })));
    expect(run2.toInsert).toHaveLength(run1.toInsert.length);
  });
});
