import { FRAMEWORKS, validateWeights, getAllFrameworks } from '../frameworks';

describe('Framework weight validation', () => {
  test.each(Object.entries(FRAMEWORKS))('"%s" weights sum to 1.0', (_, fw) => {
    const sum = fw.weights.reduce((acc, w) => acc + w.weight, 0);
    expect(Math.abs(sum - 1.0)).toBeLessThan(0.001);
  });

  test('validateWeights returns true for weights summing to 1.0', () => {
    expect(validateWeights([
      { dimension: 'financial_risk', weight: 0.2 },
      { dimension: 'security_controls', weight: 0.2 },
      { dimension: 'data_privacy', weight: 0.2 },
      { dimension: 'operational_resilience', weight: 0.2 },
      { dimension: 'governance', weight: 0.2 },
    ])).toBe(true);
  });

  test('validateWeights returns false for weights not summing to 1.0', () => {
    expect(validateWeights([
      { dimension: 'financial_risk', weight: 0.5 },
      { dimension: 'security_controls', weight: 0.3 },
    ])).toBe(false);
  });

  test('all frameworks have exactly 5 dimensions', () => {
    getAllFrameworks().forEach(fw => {
      expect(fw.weights).toHaveLength(5);
    });
  });

  test('no framework has a single dimension weight above 0.5', () => {
    getAllFrameworks().forEach(fw => {
      fw.weights.forEach(w => {
        expect(w.weight).toBeLessThanOrEqual(0.5);
      });
    });
  });

  test('agnostic framework has equal weights', () => {
    const fw = FRAMEWORKS.agnostic;
    fw.weights.forEach(w => {
      expect(w.weight).toBeCloseTo(0.2, 3);
    });
  });

  test('decision thresholds: approved_min_score > high_risk_max_score for all frameworks', () => {
    getAllFrameworks().forEach(fw => {
      expect(fw.decision_thresholds.approved_min_score).toBeGreaterThan(fw.decision_thresholds.high_risk_max_score);
    });
  });
});
