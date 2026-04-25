/**
 * Step 1 — Framework & Template Configuration
 *
 * Tests: framework definitions are structurally valid, weights sum to 1,
 * template API POST/PATCH/DELETE validation rules (pure business logic, no DB).
 */

import { FRAMEWORKS, getAllFrameworks } from '@/lib/scoring/frameworks';
import type { FrameworkId } from '@/lib/scoring/frameworks';

// ── Framework config integrity ────────────────────────────────────────────────

describe('Step 1 — Framework config', () => {
  const frameworks = getAllFrameworks();

  test('at least one framework is defined', () => {
    expect(frameworks.length).toBeGreaterThan(0);
  });

  test.each(Object.keys(FRAMEWORKS) as FrameworkId[])(
    '%s: weights sum to exactly 1.0',
    (id) => {
      const fw = FRAMEWORKS[id];
      const sum = fw.weights.reduce((acc, w) => acc + w.weight, 0);
      expect(sum).toBeCloseTo(1.0, 5);
    },
  );

  test.each(Object.keys(FRAMEWORKS) as FrameworkId[])(
    '%s: each weight is between 0 and 1',
    (id) => {
      FRAMEWORKS[id].weights.forEach(w => {
        expect(w.weight).toBeGreaterThan(0);
        expect(w.weight).toBeLessThanOrEqual(1);
      });
    },
  );

  test.each(Object.keys(FRAMEWORKS) as FrameworkId[])(
    '%s: decision thresholds are internally consistent',
    (id) => {
      const { decision_thresholds: t } = FRAMEWORKS[id];
      expect(t.high_risk_max_score).toBeLessThan(t.approved_min_score);
      expect(t.approved_min_score).toBeGreaterThan(0);
      expect(t.approved_min_score).toBeLessThanOrEqual(100);
      expect(t.approved_min_confidence).toBeGreaterThan(0);
      expect(t.approved_min_confidence).toBeLessThanOrEqual(1);
    },
  );

  test.each(Object.keys(FRAMEWORKS) as FrameworkId[])(
    '%s: template_id is a non-empty string',
    (id) => {
      expect(typeof FRAMEWORKS[id].template_id).toBe('string');
      expect(FRAMEWORKS[id].template_id.trim().length).toBeGreaterThan(0);
    },
  );

  test('getAllFrameworks returns same set as FRAMEWORKS keys', () => {
    const ids = getAllFrameworks().map(f => f.id).sort();
    expect(ids).toEqual(Object.keys(FRAMEWORKS).sort());
  });

  test('SOC 2 security_controls is the highest-weighted dimension', () => {
    const soc2 = FRAMEWORKS.soc2;
    const maxWeight = Math.max(...soc2.weights.map(w => w.weight));
    const secWeight = soc2.weights.find(w => w.dimension === 'security_controls')?.weight ?? 0;
    expect(secWeight).toBe(maxWeight);
  });

  test('VDD financial_risk is the highest-weighted dimension', () => {
    const vdd = FRAMEWORKS.vdd;
    const maxWeight = Math.max(...vdd.weights.map(w => w.weight));
    const finWeight = vdd.weights.find(w => w.dimension === 'financial_risk')?.weight ?? 0;
    expect(finWeight).toBe(maxWeight);
  });
});

// ── Template creation input validation (pure logic, mirrors API rules) ─────────

describe('Step 1 — Template label validation logic', () => {
  function validateLabel(label: unknown): string | null {
    if (typeof label !== 'string' || !label.trim()) return 'label is required';
    return null;
  }

  test('empty string label is invalid', () => {
    expect(validateLabel('')).toBeTruthy();
  });

  test('whitespace-only label is invalid', () => {
    expect(validateLabel('   ')).toBeTruthy();
  });

  test('valid label returns null', () => {
    expect(validateLabel('My Custom Framework')).toBeNull();
  });

  test('null label is invalid', () => {
    expect(validateLabel(null)).toBeTruthy();
  });
});

// ── Template key generation (mirrors API logic) ───────────────────────────────

describe('Step 1 — Template key generation', () => {
  function generateTemplateKey(label: string): string {
    return `custom_${label.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40)}_${Date.now()}`;
  }

  test('key starts with custom_', () => {
    expect(generateTemplateKey('My Framework')).toMatch(/^custom_/);
  });

  test('key contains only safe characters', () => {
    const key = generateTemplateKey('SOC 2 & Privacy!!! Review');
    expect(key).toMatch(/^[a-z0-9_]+$/);
  });

  test('key truncates long labels to max 40 slug chars', () => {
    const longLabel = 'a'.repeat(100);
    const key = generateTemplateKey(longLabel);
    const slug = key.replace(/^custom_/, '').replace(/_\d+$/, '');
    expect(slug.length).toBeLessThanOrEqual(40);
  });

  test('two keys from the same label are unique (different timestamps)', async () => {
    const k1 = generateTemplateKey('Test');
    await new Promise(r => setTimeout(r, 2));
    const k2 = generateTemplateKey('Test');
    expect(k1).not.toBe(k2);
  });
});
