// @akili-spec quality-assurance/qa-field-catalog
// DD-3: every `result` / `results?_*` table that is NOT in scope.ts must be listed here with a reason,
// so a brand-new result table cannot escape the completeness guard silently.
export interface ExcludedTable {
  table: string;
  reason: string;
}

const PENDING =
  'pending QAC-T-8…11 (inventory review decides scope vs. real exclusion)';

export const EXCLUDED_TABLES: ExcludedTable[] = [
  { table: 'result_by_level', reason: PENDING },
  { table: 'result_countries_sub_national', reason: PENDING },
  { table: 'result_deletion_audit', reason: PENDING },
  { table: 'result_field_ai_state', reason: PENDING },
  { table: 'result_field_revision', reason: PENDING },
  { table: 'result_folders', reason: PENDING },
  { table: 'result_folders_type', reason: PENDING },
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
  { table: 'result_questions', reason: PENDING },
  { table: 'result_review_history', reason: PENDING },
  { table: 'result_sdg_targets', reason: PENDING },
  {
    table: 'result_status',
    reason: 'control list of result statuses (not result data)',
  },
  { table: 'result_toc_action_area', reason: PENDING },
  { table: 'result_toc_impact_area_target', reason: PENDING },
  { table: 'result_toc_sdg_targets', reason: PENDING },
  {
    table: 'result_type',
    reason: 'control list of result types (not result data)',
  },
  { table: 'results_by_evidence', reason: PENDING },
  { table: 'results_impact_area_indicators', reason: PENDING },
  { table: 'results_impact_area_target', reason: PENDING },
  { table: 'results_innovations_use_measures', reason: PENDING },
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
