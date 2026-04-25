-- Seed questionnaire templates and questions for all four frameworks

-- ─────────────────── Templates ───────────────────

insert into public.questionnaire_templates (template_key, label, description, framework_id) values
  ('soc2_vendor',         'SOC 2 Vendor Review',       'Trust Services Criteria-based vendor assessment',            'soc2'),
  ('vdd',                 'Vendor Due Diligence',       'Comprehensive vendor due diligence questionnaire',           'vdd'),
  ('financial_controls',  'Financial Controls',         'SOX-style financial controls assessment',                    'financial_controls'),
  ('agnostic',            'Framework-Agnostic',         'General-purpose compliance questionnaire with equal weighting','agnostic')
on conflict (template_key) do nothing;

-- ─────────────────── SOC 2 Questions ───────────────────

insert into public.questions (template_id, control_category, control_id, question_text, expected_evidence_types, weight, sort_order) values

-- Security Controls
('soc2_vendor', 'Security', 'CC6.1', 'Does the organization implement logical access controls to restrict access to systems and data?', ARRAY['policy_document','access_control_matrix','audit_report'], 1.2, 1),
('soc2_vendor', 'Security', 'CC6.2', 'Are multi-factor authentication mechanisms in place for remote access and privileged accounts?', ARRAY['policy_document','screenshot','configuration_evidence'], 1.2, 2),
('soc2_vendor', 'Security', 'CC6.3', 'Is there a formal process for provisioning and deprovisioning user access?', ARRAY['policy_document','process_document','hr_record'], 1.1, 3),
('soc2_vendor', 'Security', 'CC7.1', 'Does the organization detect and respond to security events in a timely manner?', ARRAY['incident_response_plan','siem_evidence','audit_report'], 1.1, 4),
('soc2_vendor', 'Security', 'CC7.2', 'Are vulnerability assessments and penetration tests performed regularly?', ARRAY['pentest_report','vulnerability_scan','remediation_log'], 1.0, 5),
('soc2_vendor', 'Security', 'CC8.1', 'Is there a change management process that includes authorization and testing?', ARRAY['change_management_policy','change_log','approval_evidence'], 1.0, 6),

-- Availability
('soc2_vendor', 'Availability', 'A1.1', 'Does the organization have documented availability commitments and service levels?', ARRAY['sla_document','uptime_report'], 1.0, 10),
('soc2_vendor', 'Availability', 'A1.2', 'Are business continuity and disaster recovery plans in place and tested?', ARRAY['bcp_document','dr_test_results','rto_rpo_documentation'], 1.1, 11),
('soc2_vendor', 'Availability', 'A1.3', 'Is system capacity monitored and managed to meet availability commitments?', ARRAY['monitoring_dashboard','capacity_report'], 0.9, 12),

-- Confidentiality
('soc2_vendor', 'Confidentiality', 'C1.1', 'Are confidential data assets identified and classified?', ARRAY['data_classification_policy','data_inventory'], 1.0, 20),
('soc2_vendor', 'Confidentiality', 'C1.2', 'Is confidential information encrypted in transit and at rest?', ARRAY['encryption_policy','technical_evidence','configuration_evidence'], 1.1, 21),

-- Data Privacy
('soc2_vendor', 'Data Privacy', 'P3.1', 'Is there a privacy notice that discloses how personal data is collected and used?', ARRAY['privacy_policy','privacy_notice'], 1.0, 30),
('soc2_vendor', 'Data Privacy', 'P4.1', 'Does the organization honor data subject rights (access, deletion, portability)?', ARRAY['privacy_policy','process_document','dsar_log'], 1.0, 31),
('soc2_vendor', 'Data Privacy', 'P6.1', 'Are third-party data processors assessed for privacy compliance?', ARRAY['dpa_agreement','vendor_assessment','contract'], 1.0, 32),

-- Governance
('soc2_vendor', 'Governance', 'CC1.1', 'Is there a board-level or executive-level commitment to information security?', ARRAY['security_policy','board_resolution','org_chart'], 0.9, 40),
('soc2_vendor', 'Governance', 'CC2.1', 'Does the organization have documented information security policies reviewed annually?', ARRAY['security_policy','review_evidence'], 0.9, 41),
('soc2_vendor', 'Governance', 'CC3.1', 'Is a formal risk assessment process conducted at least annually?', ARRAY['risk_assessment_report','risk_register'], 1.0, 42);

-- ─────────────────── VDD Questions ───────────────────

insert into public.questions (template_id, control_category, control_id, question_text, expected_evidence_types, weight, sort_order) values

-- Financial
('vdd', 'Financial', 'VDD-FIN-01', 'Are the most recent 3 years of audited financial statements available?', ARRAY['audited_financials','audit_report'], 1.3, 1),
('vdd', 'Financial', 'VDD-FIN-02', 'What is the vendor''s current debt-to-equity ratio and credit rating?', ARRAY['financial_statements','credit_report'], 1.2, 2),
('vdd', 'Financial', 'VDD-FIN-03', 'Does the vendor have adequate working capital and liquidity to meet obligations?', ARRAY['balance_sheet','cash_flow_statement'], 1.2, 3),
('vdd', 'Financial', 'VDD-FIN-04', 'Are there any outstanding litigation, regulatory penalties, or material contingencies?', ARRAY['legal_disclosure','litigation_register','regulatory_correspondence'], 1.1, 4),
('vdd', 'Financial', 'VDD-FIN-05', 'Has the vendor undergone any significant ownership changes or M&A in the past 2 years?', ARRAY['corporate_disclosure','cap_table'], 1.0, 5),

-- Operational Resilience
('vdd', 'Operations', 'VDD-OPS-01', 'Does the vendor have documented business continuity and disaster recovery plans?', ARRAY['bcp_document','dr_test_results'], 1.2, 10),
('vdd', 'Operations', 'VDD-OPS-02', 'What is the vendor''s service uptime track record over the past 12 months?', ARRAY['uptime_report','sla_document','incident_log'], 1.1, 11),
('vdd', 'Operations', 'VDD-OPS-03', 'Are there identified single points of failure in critical systems or supply chain?', ARRAY['risk_assessment_report','architecture_diagram'], 1.0, 12),
('vdd', 'Operations', 'VDD-OPS-04', 'Does the vendor have key-person dependencies with succession planning?', ARRAY['org_chart','succession_plan'], 0.9, 13),

-- Data Handling
('vdd', 'Data Handling', 'VDD-DATA-01', 'What certifications does the vendor hold (ISO 27001, SOC 2, PCI DSS, etc.)?', ARRAY['certificate','audit_report'], 1.2, 20),
('vdd', 'Data Handling', 'VDD-DATA-02', 'How is customer data segregated from other customers'' data?', ARRAY['architecture_diagram','technical_evidence'], 1.1, 21),
('vdd', 'Data Handling', 'VDD-DATA-03', 'What is the vendor''s data retention and deletion policy?', ARRAY['data_retention_policy','process_document'], 1.0, 22),
('vdd', 'Data Handling', 'VDD-DATA-04', 'Where is data stored geographically, and does the vendor comply with data residency requirements?', ARRAY['data_map','contract','dpa_agreement'], 1.1, 23),

-- Contractual
('vdd', 'Contractual', 'VDD-CTR-01', 'Does the vendor offer a data processing agreement (DPA) or data processing addendum?', ARRAY['dpa_agreement'], 1.0, 30),
('vdd', 'Contractual', 'VDD-CTR-02', 'Are SLAs, penalty clauses, and exit rights clearly defined in the contract?', ARRAY['contract','sla_document'], 1.0, 31),
('vdd', 'Contractual', 'VDD-CTR-03', 'Does the vendor allow third-party audits or assessments by the customer?', ARRAY['contract','audit_rights_evidence'], 0.9, 32),

-- Security
('vdd', 'Security', 'VDD-SEC-01', 'Has the vendor conducted a penetration test within the past 12 months?', ARRAY['pentest_report'], 1.1, 40),
('vdd', 'Security', 'VDD-SEC-02', 'Is a vulnerability disclosure or responsible disclosure program in place?', ARRAY['security_policy','disclosure_program_evidence'], 0.9, 41);

-- ─────────────────── Financial Controls Questions ───────────────────

insert into public.questions (template_id, control_category, control_id, question_text, expected_evidence_types, weight, sort_order) values

-- Access Controls
('financial_controls', 'Access Controls', 'SOX-AC-01', 'Are access rights to financial systems reviewed and recertified quarterly?', ARRAY['access_review_evidence','access_control_matrix'], 1.3, 1),
('financial_controls', 'Access Controls', 'SOX-AC-02', 'Is privileged access to financial applications limited and monitored?', ARRAY['access_log','privileged_access_policy','audit_report'], 1.2, 2),
('financial_controls', 'Access Controls', 'SOX-AC-03', 'Are terminated employee accounts removed from financial systems within 24 hours?', ARRAY['hr_record','access_termination_log'], 1.1, 3),

-- Change Management
('financial_controls', 'Change Management', 'SOX-CM-01', 'Are all changes to financial systems subject to formal change control procedures?', ARRAY['change_management_policy','change_log','approval_evidence'], 1.2, 10),
('financial_controls', 'Change Management', 'SOX-CM-02', 'Is there a separation of duties between developers and production deployment?', ARRAY['org_chart','process_document','access_control_matrix'], 1.1, 11),
('financial_controls', 'Change Management', 'SOX-CM-03', 'Are emergency changes tracked and reviewed post-implementation?', ARRAY['change_log','post_review_evidence'], 1.0, 12),

-- Segregation of Duties
('financial_controls', 'Segregation of Duties', 'SOX-SOD-01', 'Is there documented evidence that financial transaction authorization and recording are performed by different individuals?', ARRAY['org_chart','process_document','financial_statements'], 1.3, 20),
('financial_controls', 'Segregation of Duties', 'SOX-SOD-02', 'Are compensating controls in place where SoD conflicts cannot be avoided?', ARRAY['compensating_control_evidence','risk_assessment_report'], 1.1, 21),

-- Financial Reporting
('financial_controls', 'Financial Reporting', 'SOX-FR-01', 'Is there a documented close-the-books process with checklists and sign-offs?', ARRAY['close_checklist','sign_off_evidence'], 1.2, 30),
('financial_controls', 'Financial Reporting', 'SOX-FR-02', 'Are journal entries reviewed and approved before posting?', ARRAY['journal_entry_log','approval_evidence'], 1.1, 31),
('financial_controls', 'Financial Reporting', 'SOX-FR-03', 'Are account reconciliations performed monthly with management review?', ARRAY['reconciliation_evidence','management_review_sign_off'], 1.1, 32),

-- IT General Controls
('financial_controls', 'IT General Controls', 'SOX-ITGC-01', 'Are financial systems backed up daily with restore tests conducted quarterly?', ARRAY['backup_policy','restore_test_results'], 1.0, 40),
('financial_controls', 'IT General Controls', 'SOX-ITGC-02', 'Is there a formal patch management process for financial systems?', ARRAY['patch_management_policy','patching_log'], 1.0, 41);

-- ─────────────────── Agnostic Questions ───────────────────

insert into public.questions (template_id, control_category, control_id, question_text, expected_evidence_types, weight, sort_order) values

-- Financial Risk
('agnostic', 'Financial Risk', 'AGN-FIN-01', 'Are recent financial statements available and independently audited?', ARRAY['audited_financials'], 1.0, 1),
('agnostic', 'Financial Risk', 'AGN-FIN-02', 'Is there adequate financial stability and liquidity to sustain operations?', ARRAY['financial_statements','bank_reference'], 1.0, 2),

-- Security Controls
('agnostic', 'Security Controls', 'AGN-SEC-01', 'Does the organization hold any relevant security certifications?', ARRAY['certificate','audit_report'], 1.0, 10),
('agnostic', 'Security Controls', 'AGN-SEC-02', 'Are information security policies documented and regularly reviewed?', ARRAY['security_policy','review_evidence'], 1.0, 11),
('agnostic', 'Security Controls', 'AGN-SEC-03', 'Is access to sensitive systems controlled and monitored?', ARRAY['access_control_matrix','access_log'], 1.0, 12),

-- Data Privacy
('agnostic', 'Data Privacy', 'AGN-PRV-01', 'Is there a privacy policy describing how personal data is handled?', ARRAY['privacy_policy'], 1.0, 20),
('agnostic', 'Data Privacy', 'AGN-PRV-02', 'Does the organization comply with applicable data protection regulations (GDPR, CCPA, etc.)?', ARRAY['compliance_attestation','dpa_agreement'], 1.0, 21),

-- Operational Resilience
('agnostic', 'Operational Resilience', 'AGN-OPS-01', 'Is there a business continuity plan that has been tested?', ARRAY['bcp_document','dr_test_results'], 1.0, 30),
('agnostic', 'Operational Resilience', 'AGN-OPS-02', 'Are critical dependencies and risks documented and mitigated?', ARRAY['risk_register','risk_assessment_report'], 1.0, 31),

-- Governance
('agnostic', 'Governance', 'AGN-GOV-01', 'Is there executive accountability for compliance and risk management?', ARRAY['org_chart','governance_policy'], 1.0, 40),
('agnostic', 'Governance', 'AGN-GOV-02', 'Are compliance obligations tracked and reviewed at least annually?', ARRAY['compliance_register','review_evidence'], 1.0, 41)

on conflict do nothing;
