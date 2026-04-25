export type UserRole = 'compliance_officer' | 'vendor' | 'admin';
export type EngagementStatus = 'draft' | 'in_review' | 'completed' | 'archived';
export type AnswerStatus = 'auto_filled' | 'partial' | 'missing' | 'manual';
export type EvidenceStrength = 'strong' | 'partial' | 'none';
export type GapSeverity = 'low' | 'medium' | 'high' | 'critical';
export type GapStatus = 'open' | 'in_progress' | 'resolved' | 'accepted_risk';
export type RemediationStatus = 'pending' | 'in_progress' | 'resolved';
export type ComplianceDecision = 'approved' | 'conditional' | 'high_risk';

export interface UserRoleRecord {
  user_id: string;
  role: UserRole;
  org_id: string | null;
  org_name: string | null;
  created_at: string;
}

export interface ComplianceEngagement {
  id: string;
  /** Legacy soft-link to the older `engagements` table (UUID). Not a label. */
  engagement_id: string | null;
  /** Human-readable name shown in lists, headers, and breadcrumbs. */
  engagement_name: string | null;
  /** Free-form context for reviewers. */
  notes: string | null;
  template_id: string;
  framework_id: string;
  reviewer_org_id: string | null;
  vendor_org_id: string | null;
  reviewer_user_id: string | null;
  vendor_user_id: string | null;
  vendor_company: string | null;
  vendor_email: string | null;
  status: EngagementStatus;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  template_id: string;
  control_category: string;
  control_id: string | null;
  question_text: string;
  expected_evidence_types: string[] | null;
  weight: number;
  is_required: boolean;
  sort_order: number;
}

export interface Answer {
  id: string;
  compliance_engagement_id: string;
  question_id: string;
  answer_text: string | null;
  answer_status: AnswerStatus;
  confidence_score: number | null;
  extraction_source: string | null;
  manual_override: boolean;
  override_reason: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComplianceDocument {
  id: string;
  compliance_engagement_id: string;
  uploaded_by: string | null;
  file_name: string;
  file_type: string | null;
  storage_path: string | null;
  page_count: number | null;
  extraction_status: 'queued' | 'running' | 'complete' | 'failed';
  evidence_types: string[] | null;
  created_at: string;
}

export interface EvidenceLink {
  id: string;
  compliance_engagement_id: string;
  answer_id: string;
  document_id: string | null;
  snippet_text: string | null;
  page_number: number | null;
  strength: EvidenceStrength;
  created_at: string;
}

export interface ComplianceGap {
  id: string;
  compliance_engagement_id: string;
  question_id: string | null;
  control_category: string;
  title: string;
  description: string | null;
  why_it_matters: string | null;
  suggested_evidence: string[] | null;
  severity: GapSeverity;
  status: GapStatus;
  flagged_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RemediationAction {
  id: string;
  compliance_engagement_id: string;
  gap_id: string | null;
  title: string;
  description: string | null;
  assigned_to: string | null;
  status: RemediationStatus;
  due_date: string | null;
  comment: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComplianceScore {
  id: string;
  compliance_engagement_id: string;
  dimension: string;
  score: number | null;
  confidence: number | null;
  computed_at: string;
}

export interface ComplianceReport {
  id: string;
  compliance_engagement_id: string;
  decision: ComplianceDecision;
  overall_score: number | null;
  overall_confidence: number | null;
  top_risks: { title: string; evidence_link?: string }[] | null;
  top_strengths: { title: string; evidence_link?: string }[] | null;
  gap_summary: string | null;
  raw_content: string | null;
  generated_by: string | null;
  generated_at: string;
}

// Enriched types used in UI (joins)
export interface AnswerWithQuestion extends Answer {
  question: Question;
  evidence_links?: (EvidenceLink & { document?: ComplianceDocument })[];
}

export interface GapWithActions extends ComplianceGap {
  remediation_actions?: RemediationAction[];
}
