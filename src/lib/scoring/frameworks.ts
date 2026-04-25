export type FrameworkId = 'soc2' | 'vdd' | 'financial_controls' | 'agnostic';

export type DimensionId =
  | 'financial_risk'
  | 'security_controls'
  | 'data_privacy'
  | 'operational_resilience'
  | 'governance';

export interface DimensionWeight {
  dimension: DimensionId;
  weight: number; // 0–1; all weights in a framework must sum to exactly 1.0
}

export interface DecisionThresholds {
  approved_min_score: number;       // minimum composite score for APPROVED
  approved_min_confidence: number;  // minimum confidence (0–1) for APPROVED
  high_risk_max_score: number;      // score at or below which → HIGH RISK
}

export interface FrameworkConfig {
  id: FrameworkId;
  label: string;
  description: string;
  template_id: string;   // maps to questionnaire_templates.template_key
  weights: DimensionWeight[];
  decision_thresholds: DecisionThresholds;
  kpi_labels: Record<string, string>; // framework-specific label overrides for KPI cards
}

export const DIMENSION_LABELS: Record<DimensionId, string> = {
  financial_risk:          'Financial Risk',
  security_controls:       'Security & Controls',
  data_privacy:            'Data & Privacy',
  operational_resilience:  'Operational Resilience',
  governance:              'Governance',
};

export const DIMENSION_CATEGORY_MAP: Record<DimensionId, string[]> = {
  financial_risk:         ['Financial', 'Financial Risk'],
  security_controls:      ['Security', 'Access Controls', 'Change Management', 'IT General Controls'],
  data_privacy:           ['Data Privacy', 'Confidentiality', 'Data Handling'],
  operational_resilience: ['Availability', 'Operations', 'Segregation of Duties', 'Operational Resilience'],
  governance:             ['Governance', 'Financial Reporting', 'Contractual'],
};

export const FRAMEWORKS: Record<FrameworkId, FrameworkConfig> = {
  soc2: {
    id: 'soc2',
    label: 'SOC 2 Vendor Review',
    description: 'Trust Services Criteria-based assessment (Security, Availability, Confidentiality, Processing Integrity, Privacy)',
    template_id: 'soc2_vendor',
    weights: [
      { dimension: 'security_controls',      weight: 0.35 },
      { dimension: 'data_privacy',           weight: 0.25 },
      { dimension: 'operational_resilience', weight: 0.20 },
      { dimension: 'governance',             weight: 0.15 },
      { dimension: 'financial_risk',         weight: 0.05 },
    ],
    decision_thresholds: {
      approved_min_score:      80,
      approved_min_confidence: 0.70,
      high_risk_max_score:     50,
    },
    kpi_labels: {
      primary_dimension: 'Trust Services Criteria met',
      gap_label: 'Open TSC gaps',
    },
  },

  vdd: {
    id: 'vdd',
    label: 'Vendor Due Diligence',
    description: 'Comprehensive vendor due diligence covering financial stability, operations, data handling, and contractual terms',
    template_id: 'vdd',
    weights: [
      { dimension: 'financial_risk',         weight: 0.30 },
      { dimension: 'operational_resilience', weight: 0.25 },
      { dimension: 'data_privacy',           weight: 0.20 },
      { dimension: 'governance',             weight: 0.15 },
      { dimension: 'security_controls',      weight: 0.10 },
    ],
    decision_thresholds: {
      approved_min_score:      75,
      approved_min_confidence: 0.65,
      high_risk_max_score:     45,
    },
    kpi_labels: {
      primary_dimension: 'Vendor risk assessed',
      gap_label: 'Open due diligence gaps',
    },
  },

  financial_controls: {
    id: 'financial_controls',
    label: 'Financial Controls',
    description: 'SOX-style assessment of access controls, change management, segregation of duties, and financial reporting',
    template_id: 'financial_controls',
    weights: [
      { dimension: 'security_controls',      weight: 0.30 },
      { dimension: 'governance',             weight: 0.30 },
      { dimension: 'operational_resilience', weight: 0.20 },
      { dimension: 'financial_risk',         weight: 0.15 },
      { dimension: 'data_privacy',           weight: 0.05 },
    ],
    decision_thresholds: {
      approved_min_score:      85,
      approved_min_confidence: 0.75,
      high_risk_max_score:     55,
    },
    kpi_labels: {
      primary_dimension: 'ITGC controls passing',
      gap_label: 'SOX control deficiencies',
    },
  },

  agnostic: {
    id: 'agnostic',
    label: 'Framework-Agnostic',
    description: 'General-purpose compliance questionnaire with equal weighting across all five dimensions',
    template_id: 'agnostic',
    weights: [
      { dimension: 'financial_risk',         weight: 0.20 },
      { dimension: 'security_controls',      weight: 0.20 },
      { dimension: 'data_privacy',           weight: 0.20 },
      { dimension: 'operational_resilience', weight: 0.20 },
      { dimension: 'governance',             weight: 0.20 },
    ],
    decision_thresholds: {
      approved_min_score:      70,
      approved_min_confidence: 0.60,
      high_risk_max_score:     40,
    },
    kpi_labels: {
      primary_dimension: 'Compliance coverage',
      gap_label: 'Open compliance gaps',
    },
  },
};

export function getFramework(id: FrameworkId): FrameworkConfig {
  return FRAMEWORKS[id];
}

export function getAllFrameworks(): FrameworkConfig[] {
  return Object.values(FRAMEWORKS);
}

export function validateWeights(weights: DimensionWeight[]): boolean {
  const sum = weights.reduce((acc, w) => acc + w.weight, 0);
  return Math.abs(sum - 1.0) < 0.001;
}

export function computeCompositeScore(
  dimensionScores: Partial<Record<DimensionId, number>>,
  weights: DimensionWeight[],
): number {
  let weightedSum = 0;
  let totalWeight = 0;
  for (const { dimension, weight } of weights) {
    const score = dimensionScores[dimension];
    if (score != null) {
      weightedSum += score * weight;
      totalWeight += weight;
    }
  }
  if (totalWeight === 0) return 0;
  return (weightedSum / totalWeight) * (totalWeight / weights.reduce((a, w) => a + w.weight, 0));
}

export function getDecision(
  score: number,
  confidence: number,
  thresholds: DecisionThresholds,
): 'approved' | 'conditional' | 'high_risk' {
  if (score <= thresholds.high_risk_max_score) return 'high_risk';
  if (score >= thresholds.approved_min_score && confidence >= thresholds.approved_min_confidence) return 'approved';
  return 'conditional';
}
