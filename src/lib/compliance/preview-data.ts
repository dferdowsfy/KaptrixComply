import type { ComplianceEngagement, Question, Answer, ComplianceGap, ComplianceDocument, EvidenceLink, ComplianceReport } from './types';

export const PREVIEW_ENGAGEMENT: ComplianceEngagement = {
  id: 'preview-eng-001',
  engagement_id: null,
  engagement_name: 'Acme — SOC 2 Vendor Review',
  notes: null,
  template_id: 'soc2_vendor',
  framework_id: 'soc2',
  reviewer_org_id: 'officer-org-001',
  vendor_org_id: 'acme-org-001',
  reviewer_user_id: 'officer-user-001',
  vendor_user_id: 'vendor-user-001',
  vendor_company: 'Acme Analytics Inc.',
  vendor_email: 'vendor@acme.example',
  status: 'in_review',
  due_date: '2026-06-30',
  created_at: '2026-04-01T10:00:00Z',
  updated_at: '2026-04-20T14:00:00Z',
};

export const PREVIEW_QUESTIONS: Question[] = [
  { id: 'q-cc6-1', template_id: 'soc2_vendor', control_category: 'Security', control_id: 'CC6.1', question_text: 'Does the organization implement logical access controls to restrict access to systems and data?', expected_evidence_types: ['policy_document', 'access_control_matrix'], weight: 1.2, is_required: true, sort_order: 1 },
  { id: 'q-cc6-2', template_id: 'soc2_vendor', control_category: 'Security', control_id: 'CC6.2', question_text: 'Are multi-factor authentication mechanisms in place for remote access and privileged accounts?', expected_evidence_types: ['policy_document', 'screenshot'], weight: 1.2, is_required: true, sort_order: 2 },
  { id: 'q-cc7-1', template_id: 'soc2_vendor', control_category: 'Security', control_id: 'CC7.1', question_text: 'Does the organization detect and respond to security events in a timely manner?', expected_evidence_types: ['incident_response_plan', 'siem_evidence'], weight: 1.1, is_required: true, sort_order: 3 },
  { id: 'q-a1-1', template_id: 'soc2_vendor', control_category: 'Availability', control_id: 'A1.1', question_text: 'Does the organization have documented availability commitments and service levels?', expected_evidence_types: ['sla_document', 'uptime_report'], weight: 1.0, is_required: true, sort_order: 10 },
  { id: 'q-a1-2', template_id: 'soc2_vendor', control_category: 'Availability', control_id: 'A1.2', question_text: 'Are business continuity and disaster recovery plans in place and tested?', expected_evidence_types: ['bcp_document', 'dr_test_results'], weight: 1.1, is_required: true, sort_order: 11 },
  { id: 'q-c1-1', template_id: 'soc2_vendor', control_category: 'Confidentiality', control_id: 'C1.1', question_text: 'Are confidential data assets identified and classified?', expected_evidence_types: ['data_classification_policy'], weight: 1.0, is_required: true, sort_order: 20 },
  { id: 'q-p3-1', template_id: 'soc2_vendor', control_category: 'Data Privacy', control_id: 'P3.1', question_text: 'Is there a privacy notice that discloses how personal data is collected and used?', expected_evidence_types: ['privacy_policy'], weight: 1.0, is_required: true, sort_order: 30 },
  { id: 'q-p6-1', template_id: 'soc2_vendor', control_category: 'Data Privacy', control_id: 'P6.1', question_text: 'Are third-party data processors assessed for privacy compliance?', expected_evidence_types: ['dpa_agreement', 'vendor_assessment'], weight: 1.0, is_required: true, sort_order: 31 },
  { id: 'q-cc1-1', template_id: 'soc2_vendor', control_category: 'Governance', control_id: 'CC1.1', question_text: 'Is there a board-level or executive-level commitment to information security?', expected_evidence_types: ['security_policy', 'org_chart'], weight: 0.9, is_required: true, sort_order: 40 },
  { id: 'q-cc3-1', template_id: 'soc2_vendor', control_category: 'Governance', control_id: 'CC3.1', question_text: 'Is a formal risk assessment process conducted at least annually?', expected_evidence_types: ['risk_assessment_report', 'risk_register'], weight: 1.0, is_required: true, sort_order: 41 },
];

export const PREVIEW_ANSWERS: Answer[] = [
  { id: 'ans-1', compliance_engagement_id: 'preview-eng-001', question_id: 'q-cc6-1', answer_text: 'Access is controlled via Okta SSO with role-based permissions. All access changes require manager approval via ServiceNow.', answer_status: 'auto_filled', confidence_score: 0.91, extraction_source: 'doc-policy-001', manual_override: false, override_reason: null, submitted_by: 'vendor-user-001', submitted_at: '2026-04-10T12:00:00Z', created_at: '2026-04-10T12:00:00Z', updated_at: '2026-04-10T12:00:00Z' },
  { id: 'ans-2', compliance_engagement_id: 'preview-eng-001', question_id: 'q-cc6-2', answer_text: 'MFA is enforced for all VPN and privileged access via Duo Security.', answer_status: 'auto_filled', confidence_score: 0.88, extraction_source: 'doc-policy-001', manual_override: false, override_reason: null, submitted_by: 'vendor-user-001', submitted_at: '2026-04-10T12:00:00Z', created_at: '2026-04-10T12:00:00Z', updated_at: '2026-04-10T12:00:00Z' },
  { id: 'ans-3', compliance_engagement_id: 'preview-eng-001', question_id: 'q-cc7-1', answer_text: 'We use Splunk SIEM for event monitoring. Incident response SLA is 1-hour detection, 4-hour containment.', answer_status: 'partial', confidence_score: 0.62, extraction_source: 'doc-ir-002', manual_override: false, override_reason: null, submitted_by: 'vendor-user-001', submitted_at: '2026-04-12T09:00:00Z', created_at: '2026-04-12T09:00:00Z', updated_at: '2026-04-12T09:00:00Z' },
  { id: 'ans-4', compliance_engagement_id: 'preview-eng-001', question_id: 'q-a1-1', answer_text: 'SLA guarantees 99.9% uptime per the customer agreement dated March 2026.', answer_status: 'auto_filled', confidence_score: 0.95, extraction_source: 'doc-sla-003', manual_override: false, override_reason: null, submitted_by: null, submitted_at: null, created_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'ans-5', compliance_engagement_id: 'preview-eng-001', question_id: 'q-p3-1', answer_text: 'Privacy policy is publicly available at acme.example.com/privacy. Last reviewed Jan 2026.', answer_status: 'auto_filled', confidence_score: 0.87, extraction_source: 'doc-privacy-004', manual_override: false, override_reason: null, submitted_by: null, submitted_at: null, created_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  { id: 'ans-6', compliance_engagement_id: 'preview-eng-001', question_id: 'q-cc1-1', answer_text: 'CISO reports directly to CEO; board receives quarterly security briefings.', answer_status: 'partial', confidence_score: 0.55, extraction_source: 'doc-policy-001', manual_override: false, override_reason: null, submitted_by: null, submitted_at: null, created_at: '2026-04-15T10:00:00Z', updated_at: '2026-04-15T10:00:00Z' },
  // Missing answers (no rows for q-a1-2, q-c1-1, q-p6-1, q-cc3-1)
];

export const PREVIEW_DOCUMENTS: ComplianceDocument[] = [
  { id: 'doc-policy-001', compliance_engagement_id: 'preview-eng-001', uploaded_by: 'vendor-user-001', file_name: 'Acme_InfoSec_Policy_2026.pdf', file_type: 'pdf', storage_path: null, page_count: 24, extraction_status: 'complete', evidence_types: ['policy_document', 'security_policy'], created_at: '2026-04-10T11:00:00Z' },
  { id: 'doc-ir-002',     compliance_engagement_id: 'preview-eng-001', uploaded_by: 'vendor-user-001', file_name: 'Incident_Response_Plan_v3.pdf', file_type: 'pdf', storage_path: null, page_count: 12, extraction_status: 'complete', evidence_types: ['incident_response_plan'], created_at: '2026-04-12T08:30:00Z' },
  { id: 'doc-sla-003',    compliance_engagement_id: 'preview-eng-001', uploaded_by: 'vendor-user-001', file_name: 'Acme_Customer_SLA_March2026.pdf', file_type: 'pdf', storage_path: null, page_count: 6, extraction_status: 'complete', evidence_types: ['sla_document'], created_at: '2026-04-15T09:00:00Z' },
  { id: 'doc-privacy-004',compliance_engagement_id: 'preview-eng-001', uploaded_by: 'vendor-user-001', file_name: 'Privacy_Policy_v2.pdf', file_type: 'pdf', storage_path: null, page_count: 8, extraction_status: 'complete', evidence_types: ['privacy_policy'], created_at: '2026-04-15T09:15:00Z' },
];

export const PREVIEW_EVIDENCE_LINKS: EvidenceLink[] = [
  { id: 'el-1', compliance_engagement_id: 'preview-eng-001', answer_id: 'ans-1', document_id: 'doc-policy-001', snippet_text: 'All access to production systems requires authentication via Okta SSO with role-based access control. Access changes must be approved by the direct manager via ServiceNow ticket.', page_number: 8, strength: 'strong', created_at: '2026-04-10T12:00:00Z' },
  { id: 'el-2', compliance_engagement_id: 'preview-eng-001', answer_id: 'ans-2', document_id: 'doc-policy-001', snippet_text: 'Multi-factor authentication using Duo Security is mandatory for all VPN connections and administrative access to cloud infrastructure.', page_number: 11, strength: 'strong', created_at: '2026-04-10T12:00:00Z' },
  { id: 'el-3', compliance_engagement_id: 'preview-eng-001', answer_id: 'ans-3', document_id: 'doc-ir-002', snippet_text: 'Security events are monitored via Splunk SIEM. P1 incidents require 1-hour detection and 4-hour containment SLA.', page_number: 4, strength: 'partial', created_at: '2026-04-12T09:00:00Z' },
  { id: 'el-4', compliance_engagement_id: 'preview-eng-001', answer_id: 'ans-4', document_id: 'doc-sla-003', snippet_text: 'Acme Analytics guarantees 99.9% monthly uptime for all production services as defined in Schedule A.', page_number: 2, strength: 'strong', created_at: '2026-04-15T10:00:00Z' },
];

export const PREVIEW_GAPS: ComplianceGap[] = [
  {
    id: 'gap-1',
    compliance_engagement_id: 'preview-eng-001',
    question_id: 'q-a1-2',
    control_category: 'Availability',
    title: 'No evidence of BCP/DR testing',
    description: 'The vendor has not provided evidence that their Business Continuity and Disaster Recovery plan has been tested within the past 12 months.',
    why_it_matters: 'Untested recovery plans create operational risk. SOC 2 A1.2 requires demonstrated recovery capability.',
    suggested_evidence: ['bcp_document', 'dr_test_results', 'rto_rpo_documentation'],
    severity: 'high',
    status: 'open',
    flagged_by: 'officer-user-001',
    created_at: '2026-04-18T10:00:00Z',
    updated_at: '2026-04-18T10:00:00Z',
  },
  {
    id: 'gap-2',
    compliance_engagement_id: 'preview-eng-001',
    question_id: 'q-c1-1',
    control_category: 'Confidentiality',
    title: 'Data classification policy not submitted',
    description: 'No data classification policy or data inventory has been provided to confirm how confidential data assets are identified and handled.',
    why_it_matters: 'Without a data classification framework, it is not possible to verify that confidential information is appropriately protected (SOC 2 C1.1).',
    suggested_evidence: ['data_classification_policy', 'data_inventory'],
    severity: 'medium',
    status: 'open',
    flagged_by: 'officer-user-001',
    created_at: '2026-04-18T10:15:00Z',
    updated_at: '2026-04-18T10:15:00Z',
  },
  {
    id: 'gap-3',
    compliance_engagement_id: 'preview-eng-001',
    question_id: 'q-p6-1',
    control_category: 'Data Privacy',
    title: 'Third-party processor assessment missing',
    description: 'No data processing agreements (DPAs) or third-party privacy assessments have been submitted for sub-processors.',
    why_it_matters: 'SOC 2 P6.1 requires evidence that third-party data processors are assessed for privacy compliance before data is shared.',
    suggested_evidence: ['dpa_agreement', 'vendor_assessment', 'contract'],
    severity: 'high',
    status: 'in_progress',
    flagged_by: 'officer-user-001',
    created_at: '2026-04-19T09:00:00Z',
    updated_at: '2026-04-21T11:00:00Z',
  },
];

export const PREVIEW_REPORT: ComplianceReport = {
  id: 'report-001',
  compliance_engagement_id: 'preview-eng-001',
  decision: 'conditional',
  overall_score: 67,
  overall_confidence: 0.73,
  top_risks: [
    { title: 'No BCP/DR testing evidence (Availability A1.2)' },
    { title: 'Third-party sub-processor DPAs missing (Privacy P6.1)' },
    { title: 'Incident response coverage is partial — no pentest submitted (CC7.2)' },
  ],
  top_strengths: [
    { title: 'Strong logical access controls with Okta SSO (CC6.1)' },
    { title: 'MFA enforced on all privileged access via Duo (CC6.2)' },
    { title: '99.9% uptime SLA documented and signed (A1.1)' },
  ],
  gap_summary: '3 open compliance gaps identified: 1 high in Availability, 1 medium in Confidentiality, 1 high in Data Privacy (in progress). Recommend conditional approval pending closure of BCP/DR testing evidence and sub-processor DPAs.',
  raw_content: `# Compliance Decision Report — Acme Analytics Inc.
## Framework: SOC 2 Vendor Review
## Decision: CONDITIONAL APPROVAL

### Executive Summary
Acme Analytics Inc. has completed a SOC 2 Vendor Review under the Trust Services Criteria framework. The overall risk score of **67/100** reflects strong controls in access management and availability commitments, offset by gaps in business continuity testing and third-party data processor governance.

### Decision Rationale
The vendor meets the minimum threshold for conditional approval (score ≥ 50) but does not reach full approval (score ≥ 80 with confidence ≥ 0.70). Conditions must be resolved within 90 days.

### Conditions for Full Approval
1. Submit evidence of BCP/DR plan testing (last 12 months) — Priority: HIGH
2. Provide signed DPAs for all identified sub-processors — Priority: HIGH
3. Submit most recent penetration test report — Priority: MEDIUM

### Strengths
- Comprehensive access control framework using Okta SSO with role-based permissions
- MFA enforced organization-wide for all privileged and remote access
- Clear and documented SLA commitments (99.9% uptime)
- Published privacy policy reviewed in January 2026

### Risks
- No evidence of business continuity or disaster recovery testing
- Sub-processor DPAs missing for 3 identified third parties
- Incident response coverage is partial — pentest not submitted

*Report generated 2026-04-23. Audit trail available at /officer/engagements/preview-eng-001/audit-trail.*`,
  generated_by: 'officer-user-001',
  generated_at: '2026-04-23T09:00:00Z',
};

export const PREVIEW_SCORES = [
  { id: 'score-1', compliance_engagement_id: 'preview-eng-001', dimension: 'security_controls', score: 82, confidence: 0.88, computed_at: '2026-04-20T12:00:00Z' },
  { id: 'score-2', compliance_engagement_id: 'preview-eng-001', dimension: 'data_privacy', score: 58, confidence: 0.65, computed_at: '2026-04-20T12:00:00Z' },
  { id: 'score-3', compliance_engagement_id: 'preview-eng-001', dimension: 'operational_resilience', score: 51, confidence: 0.70, computed_at: '2026-04-20T12:00:00Z' },
  { id: 'score-4', compliance_engagement_id: 'preview-eng-001', dimension: 'governance', score: 72, confidence: 0.68, computed_at: '2026-04-20T12:00:00Z' },
  { id: 'score-5', compliance_engagement_id: 'preview-eng-001', dimension: 'financial_risk', score: 85, confidence: 0.80, computed_at: '2026-04-20T12:00:00Z' },
];
