/**
 * Rule-based remediation templates keyed by control_id.
 *
 * action_type and next_action come from this table — never from LLM inference.
 * The API route may use the LLM to phrase a specific instance using the
 * template + evidence context, but the core fields are static.
 */

export type ActionType =
  | 'upload_document'
  | 'define_policy'
  | 'contact_vendor'
  | 'internal_review';

export interface RemediationTemplate {
  issue_description: string;
  risk_implication: string;
  next_action: string;
  action_type: ActionType;
}

export const REMEDIATION_RULES: Record<string, RemediationTemplate> = {
  // ── SOC 2 Security ──────────────────────────────────────────────────────────
  'CC6.1': {
    issue_description: 'No logical access control policy or evidence on file',
    risk_implication: 'Without documented access controls, unauthorized access to systems and data cannot be ruled out',
    next_action: 'Upload access control policy, access control matrix, or relevant audit report excerpt',
    action_type: 'upload_document',
  },
  'CC6.2': {
    issue_description: 'Multi-factor authentication not evidenced',
    risk_implication: 'Remote and privileged accounts without MFA are at elevated risk of compromise',
    next_action: 'Upload MFA policy or screenshot/configuration evidence showing MFA is enabled',
    action_type: 'upload_document',
  },
  'CC6.3': {
    issue_description: 'No user provisioning/deprovisioning process documented',
    risk_implication: 'Lack of formal access lifecycle process risks stale or orphaned accounts retaining access',
    next_action: 'Upload provisioning/deprovisioning policy or HR process documentation',
    action_type: 'define_policy',
  },
  'CC7.1': {
    issue_description: 'No security event detection and response evidence',
    risk_implication: 'Without incident detection, breaches may go unnoticed or response may be delayed',
    next_action: 'Upload incident response plan or SIEM/detection tool evidence',
    action_type: 'upload_document',
  },
  'CC7.2': {
    issue_description: 'No penetration test or vulnerability assessment on file',
    risk_implication: 'Unidentified vulnerabilities may remain unpatched and exploitable',
    next_action: 'Upload most recent pentest report or vulnerability scan results',
    action_type: 'upload_document',
  },
  'CC8.1': {
    issue_description: 'Change management process not documented or evidenced',
    risk_implication: 'Uncontrolled changes to systems can introduce vulnerabilities or outages',
    next_action: 'Upload change management policy and sample change log with approvals',
    action_type: 'upload_document',
  },
  // ── SOC 2 Availability ───────────────────────────────────────────────────────
  'A1.1': {
    issue_description: 'No availability commitments or SLA documentation provided',
    risk_implication: 'Without SLAs, availability obligations cannot be verified and penalties unenforceable',
    next_action: 'Upload SLA document or uptime report',
    action_type: 'upload_document',
  },
  'A1.2': {
    issue_description: 'Business continuity and disaster recovery plan not evidenced',
    risk_implication: 'Inability to recover from disruption exposes the organization to prolonged outages',
    next_action: 'Upload BCP/DR plan and most recent DR test results',
    action_type: 'upload_document',
  },
  'A1.3': {
    issue_description: 'Capacity monitoring evidence not provided',
    risk_implication: 'Unmonitored capacity may lead to availability degradation during peak loads',
    next_action: 'Upload capacity report or monitoring dashboard evidence',
    action_type: 'upload_document',
  },
  // ── SOC 2 Confidentiality ────────────────────────────────────────────────────
  'C1.1': {
    issue_description: 'Data classification policy or inventory not provided',
    risk_implication: 'Without data classification, sensitive assets may not receive appropriate protection',
    next_action: 'Upload data classification policy and data inventory',
    action_type: 'define_policy',
  },
  'C1.2': {
    issue_description: 'Encryption in transit and at rest not evidenced',
    risk_implication: 'Unencrypted confidential data is exposed to interception and unauthorized access',
    next_action: 'Upload encryption policy and technical configuration evidence',
    action_type: 'upload_document',
  },
  // ── SOC 2 Data Privacy ────────────────────────────────────────────────────────
  'P3.1': {
    issue_description: 'Privacy notice not provided',
    risk_implication: 'Missing privacy notice may constitute a regulatory violation under GDPR/CCPA',
    next_action: 'Upload privacy policy or privacy notice document',
    action_type: 'define_policy',
  },
  'P4.1': {
    issue_description: 'Data subject rights process not documented',
    risk_implication: 'Inability to honor DSAR requests creates regulatory and reputational risk',
    next_action: 'Upload privacy policy section on data subject rights or DSAR process document',
    action_type: 'define_policy',
  },
  'P6.1': {
    issue_description: 'Third-party data processor assessment not evidenced',
    risk_implication: 'Unassessed sub-processors may not meet the same privacy standards, creating liability',
    next_action: 'Upload data processing agreements (DPAs) with key sub-processors',
    action_type: 'contact_vendor',
  },
  // ── SOC 2 Governance ─────────────────────────────────────────────────────────
  'CC1.1': {
    issue_description: 'No board or executive information security commitment evidenced',
    risk_implication: 'Without leadership commitment, security programs lack the authority and resources to be effective',
    next_action: 'Upload board resolution, security policy signed by executive, or org chart showing CISO role',
    action_type: 'internal_review',
  },
  'CC2.1': {
    issue_description: 'Information security policies not documented or not reviewed annually',
    risk_implication: 'Stale or missing security policies undermine the entire control environment',
    next_action: 'Upload security policy with evidence of annual review (e.g., review date, approver signature)',
    action_type: 'define_policy',
  },
  'CC3.1': {
    issue_description: 'Annual risk assessment not on file',
    risk_implication: 'Without formal risk assessment, emerging threats may go unidentified and unmitigated',
    next_action: 'Upload most recent risk assessment report or risk register',
    action_type: 'upload_document',
  },
  // ── VDD Financial ────────────────────────────────────────────────────────────
  'VDD-FIN-01': {
    issue_description: 'Audited financial statements for last 3 years not provided',
    risk_implication: 'Financial health and stability cannot be verified without audited statements',
    next_action: 'Upload audited financial statements for the past 3 fiscal years',
    action_type: 'upload_document',
  },
  'VDD-FIN-02': {
    issue_description: 'Debt-to-equity ratio and credit information not available',
    risk_implication: 'High leverage or poor credit rating may signal financial instability',
    next_action: 'Upload most recent financial statements and credit report if available',
    action_type: 'contact_vendor',
  },
  'VDD-FIN-03': {
    issue_description: 'Working capital and liquidity evidence not provided',
    risk_implication: 'Insufficient liquidity may prevent the vendor from meeting operational obligations',
    next_action: 'Upload balance sheet and cash flow statement',
    action_type: 'upload_document',
  },
  'VDD-FIN-04': {
    issue_description: 'Litigation, regulatory penalties, or contingencies not disclosed',
    risk_implication: 'Undisclosed legal exposure may materially affect vendor viability',
    next_action: 'Request legal disclosure or litigation register from vendor',
    action_type: 'contact_vendor',
  },
  'VDD-FIN-05': {
    issue_description: 'Ownership changes or M&A activity not disclosed',
    risk_implication: 'Undisclosed ownership changes may affect service continuity and contractual obligations',
    next_action: 'Upload corporate disclosure or cap table documentation',
    action_type: 'contact_vendor',
  },
  // ── VDD Operations ───────────────────────────────────────────────────────────
  'VDD-OPS-01': {
    issue_description: 'Business continuity and DR plans not provided',
    risk_implication: 'Without BCP/DR, vendor inability to recover from incidents creates service risk',
    next_action: 'Upload BCP document and DR test results',
    action_type: 'upload_document',
  },
  'VDD-OPS-02': {
    issue_description: 'Service uptime track record not provided',
    risk_implication: 'Cannot verify availability commitments without historical uptime data',
    next_action: 'Upload uptime report or SLA document covering past 12 months',
    action_type: 'contact_vendor',
  },
  'VDD-OPS-03': {
    issue_description: 'Single points of failure not assessed',
    risk_implication: 'Unidentified SPOFs create concentration risk in critical systems or supply chain',
    next_action: 'Upload risk assessment report or architecture diagram identifying SPOFs',
    action_type: 'internal_review',
  },
  'VDD-OPS-04': {
    issue_description: 'Key-person dependencies and succession plan not disclosed',
    risk_implication: 'Heavy reliance on a few individuals without succession planning creates continuity risk',
    next_action: 'Upload org chart and succession plan documentation',
    action_type: 'contact_vendor',
  },
  // ── VDD Data Handling ────────────────────────────────────────────────────────
  'VDD-DATA-01': {
    issue_description: 'No security certifications (ISO 27001, SOC 2, PCI DSS) provided',
    risk_implication: 'Without independent certification, security posture relies solely on vendor self-attestation',
    next_action: 'Upload current certificate(s) and relevant audit report(s)',
    action_type: 'upload_document',
  },
  'VDD-DATA-02': {
    issue_description: 'Data segregation approach not evidenced',
    risk_implication: 'Lack of data isolation controls may expose customer data to other tenants',
    next_action: 'Upload architecture diagram or technical evidence showing data segregation',
    action_type: 'contact_vendor',
  },
  'VDD-DATA-03': {
    issue_description: 'Data retention and deletion policy not provided',
    risk_implication: 'Without clear retention policy, data may be held longer than legally permissible',
    next_action: 'Upload data retention and deletion policy',
    action_type: 'define_policy',
  },
  'VDD-DATA-04': {
    issue_description: 'Data residency and geographic storage locations not disclosed',
    risk_implication: 'Data stored outside approved jurisdictions may violate data residency requirements',
    next_action: 'Upload data map and confirm compliance with applicable data residency requirements',
    action_type: 'contact_vendor',
  },
  // ── VDD Contractual ──────────────────────────────────────────────────────────
  'VDD-CTR-01': {
    issue_description: 'Data processing agreement (DPA) not provided',
    risk_implication: 'Processing personal data without a DPA is a GDPR violation',
    next_action: 'Upload signed DPA or data processing addendum',
    action_type: 'upload_document',
  },
  'VDD-CTR-02': {
    issue_description: 'SLAs, penalty clauses, and exit rights not clearly defined',
    risk_implication: 'Without clear SLAs and exit rights, recourse for poor performance is limited',
    next_action: 'Upload signed contract with SLA schedule and termination provisions',
    action_type: 'upload_document',
  },
  'VDD-CTR-03': {
    issue_description: 'Third-party audit rights not evidenced in contract',
    risk_implication: 'Without audit rights, independent verification of vendor controls is not contractually guaranteed',
    next_action: 'Upload contract section confirming audit rights or request amendment',
    action_type: 'contact_vendor',
  },
  // ── VDD Security ─────────────────────────────────────────────────────────────
  'VDD-SEC-01': {
    issue_description: 'Penetration test within past 12 months not provided',
    risk_implication: 'Untested systems may contain known exploitable vulnerabilities',
    next_action: 'Upload most recent penetration test report (within 12 months)',
    action_type: 'upload_document',
  },
  'VDD-SEC-02': {
    issue_description: 'Vulnerability disclosure program not evidenced',
    risk_implication: 'Without a disclosure program, third-party researchers cannot responsibly report vulnerabilities',
    next_action: 'Upload security policy or link to responsible disclosure program',
    action_type: 'define_policy',
  },
  // ── Financial Controls — Access Controls ─────────────────────────────────────
  'SOX-AC-01': {
    issue_description: 'Quarterly access recertification not evidenced',
    risk_implication: 'Without periodic access reviews, stale entitlements accumulate and may violate SOX requirements',
    next_action: 'Upload quarterly access review evidence or access recertification records',
    action_type: 'upload_document',
  },
  'SOX-AC-02': {
    issue_description: 'Privileged access monitoring not evidenced',
    risk_implication: 'Unmonitored privileged access to financial applications increases fraud and error risk',
    next_action: 'Upload privileged access policy and access logs showing monitoring',
    action_type: 'upload_document',
  },
  'SOX-AC-03': {
    issue_description: 'Terminated employee account removal SLA not evidenced',
    risk_implication: 'Accounts not removed promptly after termination create unauthorized access risk to financial systems',
    next_action: 'Upload HR records and access termination log showing timely removal',
    action_type: 'upload_document',
  },
  // ── Financial Controls — Change Management ───────────────────────────────────
  'SOX-CM-01': {
    issue_description: 'Change control procedures for financial systems not documented',
    risk_implication: 'Uncontrolled changes to financial systems risk unauthorized modifications and data integrity issues',
    next_action: 'Upload change management policy and sample change log with approvals',
    action_type: 'define_policy',
  },
  'SOX-CM-02': {
    issue_description: 'Separation of duties between developers and production not evidenced',
    risk_implication: 'Without SoD, a single person can make and deploy malicious changes without detection',
    next_action: 'Upload org chart and access control matrix showing developer/prod separation',
    action_type: 'internal_review',
  },
  'SOX-CM-03': {
    issue_description: 'Emergency change tracking and post-implementation review not evidenced',
    risk_implication: 'Emergency changes without post-review create accountability gaps and audit risk',
    next_action: 'Upload emergency change log and post-implementation review records',
    action_type: 'upload_document',
  },
  // ── Financial Controls — Segregation of Duties ───────────────────────────────
  'SOX-SOD-01': {
    issue_description: 'Financial transaction authorization and recording SoD not documented',
    risk_implication: 'Without SoD for financial transactions, a single employee could commit and conceal fraud',
    next_action: 'Upload org chart and process document showing SoD in authorization and recording',
    action_type: 'internal_review',
  },
  'SOX-SOD-02': {
    issue_description: 'Compensating controls for SoD conflicts not documented',
    risk_implication: 'Unaddressed SoD conflicts without compensating controls are a material weakness under SOX',
    next_action: 'Upload compensating control evidence and risk assessment for known SoD conflicts',
    action_type: 'internal_review',
  },
  // ── Financial Controls — Financial Reporting ─────────────────────────────────
  'SOX-FR-01': {
    issue_description: 'Close-the-books process with sign-offs not documented',
    risk_implication: 'Without documented close process, financial statements may lack appropriate controls and evidence',
    next_action: 'Upload period-close checklist with management sign-offs',
    action_type: 'define_policy',
  },
  'SOX-FR-02': {
    issue_description: 'Journal entry review and approval not evidenced',
    risk_implication: 'Unapproved journal entries are a significant fraud risk and SOX control deficiency',
    next_action: 'Upload journal entry log showing approval workflow',
    action_type: 'upload_document',
  },
  'SOX-FR-03': {
    issue_description: 'Monthly account reconciliations with management review not evidenced',
    risk_implication: 'Without regular reconciliations, errors and discrepancies in financial statements go undetected',
    next_action: 'Upload reconciliation evidence and management review sign-off',
    action_type: 'upload_document',
  },
  // ── Financial Controls — ITGC ────────────────────────────────────────────────
  'SOX-ITGC-01': {
    issue_description: 'Daily backup and quarterly restore test not evidenced',
    risk_implication: 'Without verified backups and restore tests, financial data recovery cannot be guaranteed',
    next_action: 'Upload backup policy and most recent restore test results',
    action_type: 'upload_document',
  },
  'SOX-ITGC-02': {
    issue_description: 'Patch management process for financial systems not documented',
    risk_implication: 'Unpatched financial systems expose the organization to known vulnerabilities',
    next_action: 'Upload patch management policy and patching log for financial systems',
    action_type: 'define_policy',
  },
  // ── Agnostic ─────────────────────────────────────────────────────────────────
  'AGN-FIN-01': {
    issue_description: 'Independently audited financial statements not provided',
    risk_implication: 'Financial health cannot be independently verified without audited statements',
    next_action: 'Upload most recent audited financial statements',
    action_type: 'upload_document',
  },
  'AGN-FIN-02': {
    issue_description: 'Financial stability and liquidity evidence not provided',
    risk_implication: 'Without liquidity evidence, financial distress risk cannot be assessed',
    next_action: 'Upload financial statements or bank reference letter',
    action_type: 'upload_document',
  },
  'AGN-SEC-01': {
    issue_description: 'No security certification on file',
    risk_implication: 'Without independent certification, security posture is unverified',
    next_action: 'Upload relevant security certificate(s)',
    action_type: 'upload_document',
  },
  'AGN-SEC-02': {
    issue_description: 'Information security policies not documented or reviewed',
    risk_implication: 'Without formal policies, there is no baseline for expected security behavior',
    next_action: 'Upload information security policy with review date',
    action_type: 'define_policy',
  },
  'AGN-SEC-03': {
    issue_description: 'Access controls to sensitive systems not documented',
    risk_implication: 'Without evidence of access controls, unauthorized access cannot be ruled out',
    next_action: 'Upload access control matrix or access log',
    action_type: 'upload_document',
  },
  'AGN-PRV-01': {
    issue_description: 'Privacy policy not provided',
    risk_implication: 'Absence of privacy policy may be a regulatory violation and creates transparency risk',
    next_action: 'Upload privacy policy document',
    action_type: 'define_policy',
  },
  'AGN-PRV-02': {
    issue_description: 'GDPR/CCPA compliance not evidenced',
    risk_implication: 'Non-compliance with applicable privacy regulations creates regulatory and reputational risk',
    next_action: 'Upload compliance attestation or data processing agreement',
    action_type: 'upload_document',
  },
  'AGN-OPS-01': {
    issue_description: 'Business continuity plan not provided or not tested',
    risk_implication: 'Without a tested BCP, recovery from disruption is not assured',
    next_action: 'Upload BCP document and DR test results',
    action_type: 'upload_document',
  },
  'AGN-OPS-02': {
    issue_description: 'Risk register and mitigation documentation not provided',
    risk_implication: 'Without documented risk management, critical risks may go unaddressed',
    next_action: 'Upload risk register and risk assessment report',
    action_type: 'upload_document',
  },
  'AGN-GOV-01': {
    issue_description: 'Executive accountability for compliance not evidenced',
    risk_implication: 'Without designated executive ownership, compliance programs lack authority to be effective',
    next_action: 'Upload org chart showing compliance role and governance policy',
    action_type: 'internal_review',
  },
  'AGN-GOV-02': {
    issue_description: 'Annual compliance review not evidenced',
    risk_implication: 'Without annual review, compliance posture may drift and obligations go untracked',
    next_action: 'Upload compliance register and evidence of annual review',
    action_type: 'internal_review',
  },
};

/**
 * Look up the remediation template for a given control_id.
 * Falls back to a generic template when no specific rule exists.
 */
export function getRemediationTemplate(controlId: string | null | undefined): RemediationTemplate {
  if (controlId && REMEDIATION_RULES[controlId]) {
    return REMEDIATION_RULES[controlId];
  }
  return {
    issue_description: 'Required evidence not provided for this control',
    risk_implication: 'This control cannot be verified without supporting documentation',
    next_action: 'Upload relevant documentation addressing this control requirement',
    action_type: 'upload_document',
  };
}
