// @akili-spec quality-assurance/qa-field-catalog
// DD-3: every `result` / `results?_*` table that is NOT in scope.ts must be listed here with a reason,
// so a brand-new result table cannot escape the completeness guard silently.
export interface ExcludedTable {
  table: string;
  reason: string;
}

const LEGACY_MAPPING =
  'legacy v1 impact-area / SDG mapping (inventory 2026-A §6 lists the result_toc_* tables and the mapping_sdg / mapping_impact columns as legacy); no field of the inventoried 2026 forms (2026-A, 2026-B) binds it';

export const EXCLUDED_TABLES: ExcludedTable[] = [
  {
    table: 'result_by_level',
    reason:
      'control list of valid (result_level_id, result_type_id) pairs; it has no result_id (not result data)',
  },
  {
    table: 'result_countries_sub_national',
    reason:
      'legacy sub-national table, not written by the v2 path; the 2026 sub-national answers are catalogued through result_country_subnational (inventory 2026-A §6)',
  },
  {
    table: 'result_deletion_audit',
    reason:
      'system audit log of result deletions (who/when/justification); not data entered in the result form',
  },
  {
    table: 'result_field_ai_state',
    reason:
      'state of the AI assistant per field (suggestion, feedback); system-generated, not a form field',
  },
  {
    table: 'result_field_revision',
    reason:
      'revision history of AI-assisted field edits; system-generated, not a form field',
  },
  {
    table: 'result_folders',
    reason:
      'SharePoint folder configuration per phase; it has no result_id (admin configuration, not result data)',
  },
  {
    table: 'result_folders_type',
    reason: 'control list of SharePoint folder types (not result data)',
  },
  {
    table: 'result_innov_section',
    reason:
      'control list of the innovation-use `section_id` (not result data; inventory 2026-B §7.2)',
  },
  {
    table: 'result_ip_action_area_outcome',
    reason:
      'IPSR step 1 component not rendered on the 2026 form (S1; inventory 2026-B §7.2)',
  },
  {
    table: 'result_ip_expert',
    reason:
      'IPSR experts section removed from step 1 (innovation-pathway-step-one.service.ts:166; inventory 2026-B §7.2)',
  },
  {
    table: 'result_ip_expertises',
    reason:
      'IPSR experts section removed from step 1 (innovation-pathway-step-one.service.ts:166; inventory 2026-B §7.2)',
  },
  {
    table: 'result_ip_impact_area_target',
    reason:
      'IPSR step 1 component not rendered on the 2026 form (S1; inventory 2026-B §7.2)',
  },
  {
    table: 'result_ip_sdg_targets',
    reason:
      'IPSR step 1 component not rendered on the 2026 form (S1; inventory 2026-B §7.2)',
  },
  {
    table: 'result_level',
    reason: 'control list of result levels (not result data)',
  },
  {
    table: 'result_qaed_log',
    reason: 'QA audit log written by the QA flow (not catalogued result data)',
  },
  {
    table: 'result_question_types',
    reason: 'control list of question types (not result data)',
  },
  {
    table: 'result_questions',
    reason:
      'control list of question rows; QA receives their options as control lists, only result_answers is result data (inventory 2026-A §3, §6)',
  },
  {
    table: 'result_review_history',
    reason:
      'review workflow log (action / comment of reviewers); written by the review flow, not a form field',
  },
  { table: 'result_sdg_targets', reason: LEGACY_MAPPING },
  {
    table: 'result_status',
    reason: 'control list of result statuses (not result data)',
  },
  { table: 'result_toc_action_area', reason: LEGACY_MAPPING },
  { table: 'result_toc_impact_area_target', reason: LEGACY_MAPPING },
  { table: 'result_toc_sdg_targets', reason: LEGACY_MAPPING },
  {
    table: 'result_type',
    reason: 'control list of result types (not result data)',
  },
  {
    table: 'results_by_evidence',
    reason:
      'link table between results and evidence rows; the 2026 evidence list is catalogued through evidence / evidence_sharepoint (inventory 2026-A evidence section), no field binds this table',
  },
  { table: 'results_impact_area_indicators', reason: LEGACY_MAPPING },
  { table: 'results_impact_area_target', reason: LEGACY_MAPPING },
  {
    table: 'results_innovations_use_measures',
    reason:
      'legacy innovation-use measures table (read only by replication and delete flows); the 2026 form stores its measures in result_ip_measure, bound by innovation_use.*.measures (inventory 2026-B §3.3)',
  },
  {
    table: 'results_kp_fair_baseline',
    reason: 'FAIR baseline, not shown in the 2026 form (inventory 2026-A §6)',
  },
  {
    table: 'results_kp_mqap_institutions',
    reason:
      'knowledge product matching helper; its content surfaces through partners.kp_additional_partners (inventory 2026-A §6)',
  },
];
