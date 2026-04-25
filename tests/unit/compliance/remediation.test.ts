import { REMEDIATION_RULES, getRemediationTemplate } from '@/lib/remediation/rules';
import { FRAMEWORKS } from '@/lib/scoring/frameworks';

const ALL_CONTROL_IDS_FROM_SEED = [
  // SOC 2
  'CC6.1', 'CC6.2', 'CC6.3', 'CC7.1', 'CC7.2', 'CC8.1',
  'A1.1', 'A1.2', 'A1.3',
  'C1.1', 'C1.2',
  'P3.1', 'P4.1', 'P6.1',
  'CC1.1', 'CC2.1', 'CC3.1',
  // VDD
  'VDD-FIN-01', 'VDD-FIN-02', 'VDD-FIN-03', 'VDD-FIN-04', 'VDD-FIN-05',
  'VDD-OPS-01', 'VDD-OPS-02', 'VDD-OPS-03', 'VDD-OPS-04',
  'VDD-DATA-01', 'VDD-DATA-02', 'VDD-DATA-03', 'VDD-DATA-04',
  'VDD-CTR-01', 'VDD-CTR-02', 'VDD-CTR-03',
  'VDD-SEC-01', 'VDD-SEC-02',
  // Financial Controls
  'SOX-AC-01', 'SOX-AC-02', 'SOX-AC-03',
  'SOX-CM-01', 'SOX-CM-02', 'SOX-CM-03',
  'SOX-SOD-01', 'SOX-SOD-02',
  'SOX-FR-01', 'SOX-FR-02', 'SOX-FR-03',
  'SOX-ITGC-01', 'SOX-ITGC-02',
  // Agnostic
  'AGN-FIN-01', 'AGN-FIN-02',
  'AGN-SEC-01', 'AGN-SEC-02', 'AGN-SEC-03',
  'AGN-PRV-01', 'AGN-PRV-02',
  'AGN-OPS-01', 'AGN-OPS-02',
  'AGN-GOV-01', 'AGN-GOV-02',
];

describe('REMEDIATION_RULES', () => {
  test('every seeded control_id has a matching rule entry', () => {
    for (const id of ALL_CONTROL_IDS_FROM_SEED) {
      expect(id in REMEDIATION_RULES).toBe(true);
    }
  });

  test('every rule has required fields with non-empty values', () => {
    for (const [id, rule] of Object.entries(REMEDIATION_RULES)) {
      expect(typeof rule.issue_description).toBe('string');
      expect(rule.issue_description.length).toBeGreaterThan(0);
      expect(typeof rule.risk_implication).toBe('string');
      expect(rule.risk_implication.length).toBeGreaterThan(0);
      expect(typeof rule.next_action).toBe('string');
      expect(rule.next_action.length).toBeGreaterThan(0);
      expect(['upload_document', 'define_policy', 'contact_vendor', 'internal_review']).toContain(rule.action_type);
      // Suppress unused variable warning
      void id;
    }
  });
});

describe('getRemediationTemplate', () => {
  test('returns the matching rule for a known control_id', () => {
    const rule = getRemediationTemplate('CC6.1');
    expect(rule.action_type).toBe('upload_document');
    expect(rule.issue_description.length).toBeGreaterThan(0);
  });

  test('returns a generic fallback for an unknown control_id', () => {
    const fallback = getRemediationTemplate('UNKNOWN-ID-XYZ');
    expect(fallback.action_type).toBe('upload_document');
    expect(fallback.issue_description).toBe('Required evidence not provided for this control');
  });

  test('returns generic fallback for null input', () => {
    const fallback = getRemediationTemplate(null);
    expect(fallback.action_type).toBe('upload_document');
  });

  test('returns generic fallback for undefined input', () => {
    const fallback = getRemediationTemplate(undefined);
    expect(fallback.action_type).toBe('upload_document');
  });
});

describe('Coverage: all frameworks dimension categories have remediation rules for seeded questions', () => {
  test('SOC 2 framework seeded control IDs are all represented', () => {
    const soc2ControlIds = Object.keys(REMEDIATION_RULES).filter(id =>
      !id.startsWith('VDD-') && !id.startsWith('SOX-') && !id.startsWith('AGN-'),
    );
    expect(soc2ControlIds.length).toBeGreaterThan(10);
  });

  test('VDD framework seeded control IDs are all represented', () => {
    const vddIds = Object.keys(REMEDIATION_RULES).filter(id => id.startsWith('VDD-'));
    expect(vddIds.length).toBeGreaterThan(10);
  });

  test('Financial controls seeded IDs are all represented', () => {
    const soxIds = Object.keys(REMEDIATION_RULES).filter(id => id.startsWith('SOX-'));
    expect(soxIds.length).toBeGreaterThan(8);
  });

  test('Agnostic framework seeded IDs are all represented', () => {
    const agnIds = Object.keys(REMEDIATION_RULES).filter(id => id.startsWith('AGN-'));
    expect(agnIds.length).toBeGreaterThan(8);
  });
});
