// @akili-spec quality-assurance/qa-field-catalog
// QAC-T-10 · inventory 2026-B §3.1 (`policy_change`, page PC). Keys frozen as written in the inventory.
// Stage 1 = the four rows with a live rule (VPC). The three optional rows (`usd_amount`, `amount_status`,
// `actors_influenced`: UI [required]=false, no live rule) are PENDING_CATALOG (REVIEW §4, inventory 2026-B §7.4).
//
// `policy_change.related_to` is bound structurally (decision 2026-10-06): its options are the children of the single
// level-1 question of `result_type_id = 1` in `result_questions`; no question id is hard-coded here (ids shift between
// environments: test root 49 / options 50-51, prod root 48 / options 49-50). The binding is the same `result_answers`
// relation T-9 uses for the innovation development questions; QA must match the options by label, not by id.
// The live function counts ANY active `answer_boolean = 1` row of the result (VPC:20-27), no question filter.
import { CatalogField, CatalogSection } from '../types';
import { FROM_2026 } from './shared';

export const POLICY_CHANGE_SECTION: CatalogSection = {
  key: 'policy_change_info',
  label: 'Policy change',
  order: 50,
  result_types: ['policy_change'],
  ...FROM_2026,
};

const SECTION = POLICY_CHANGE_SECTION.key;
const TABLE = 'results_policy_changes';
const TYPES = ['policy_change'];

export const POLICY_CHANGE_FIELDS: CatalogField[] = [
  {
    key: 'policy_change.policy_type',
    label: 'Policy type',
    type: 'single_select',
    control_list: 'policy_types',
    section: SECTION,
    order: 1,
    result_types: TYPES,
    required: true,
    required_confirmed: true,
    ...FROM_2026,
    storage: { kind: 'column', table: TABLE, column: 'policy_type_id' },
  },
  {
    key: 'policy_change.related_to',
    label: 'Is this result related to:',
    // Options are the children of the single level-1 question of the policy change type (DB text, matched by label);
    // the live function requires at least one active answer. The form has no help text for this control.
    type: 'single_select',
    control_list: 'policy_related_questions',
    section: SECTION,
    order: 4,
    result_types: TYPES,
    required: true,
    required_confirmed: true,
    ...FROM_2026,
    storage: {
      kind: 'relation',
      table: 'result_answers',
      fk_to_result: 'result_id',
      value_column: 'result_question_id',
      filter: { answer_boolean: 1, is_active: 1 },
    },
  },
  {
    key: 'policy_change.policy_stage',
    label: 'Stage',
    type: 'single_select',
    control_list: 'policy_stages',
    section: SECTION,
    order: 6,
    result_types: TYPES,
    required: true,
    required_confirmed: true,
    ...FROM_2026,
    storage: { kind: 'column', table: TABLE, column: 'policy_stage_id' },
  },
  {
    // The live function requires at least 1 organization and does not enforce the maximum of 3.
    key: 'policy_change.implementing_organizations',
    label: 'Whose policy is this? (Implementing organizations)',
    description:
      "Select min 1, max 3 organizations\nIf you don't find the organization you are looking for, request to have it added to the list. Please note that once your partner request is approved, it could take up to an hour to be available in the CLARISA institutions list.",
    type: 'multi_select',
    control_list: 'institutions',
    section: SECTION,
    order: 7,
    result_types: TYPES,
    required: true,
    required_confirmed: true,
    ...FROM_2026,
    storage: {
      kind: 'relation',
      table: 'results_by_institution',
      fk_to_result: 'result_id',
      value_column: 'institutions_id',
      filter: { institution_roles_id: 4, is_active: 1 },
    },
  },
];
