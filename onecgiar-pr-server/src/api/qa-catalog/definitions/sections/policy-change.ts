// @akili-spec quality-assurance/qa-field-catalog
// QAC-T-10 · inventory 2026-B §3.1 (`policy_change`, page PC). Keys frozen as written in the inventory.
// Stage 1 = the four rows with a live rule (VPC). QAC-T-21 adds the three optional rows (`usd_amount`, `amount_status`,
// `actors_influenced`: UI [required]=false, no live rule), so `required` = form ∪ live function (option B) is false for them.
// Form = policy-change-info.component.html (PC) / .ts (PCT); live function = tmp/validation_policy_change_P25 (VPC).
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
    // Grey guidance box above the select (PC:4, PCT:19-23 POLICY_TYPE_GUIDANCE_2026; the legacy wording is for phases before 2026).
    description:
      'Policy type guidance\nPolicy or strategy: Policies are written and formally approved decisions on, or commitments to, a particular course of action by an institution or organization (including but not limited to governments, NGOs, private sector). Strategies are high-level plans outlining how a particular course of action will be carried out. These documents show the intent of an organization or entity. Examples are country growth strategies, country agricultural policies, organization strategic plans or road maps. These documents set the goalposts but then require other instruments for implementation.\nLegal instrument: Legal instruments include laws, which are defined as Bills passed into law by the highest elected body (a parliament, congress or equivalent); or regulations, which are defined as rules or norms adopted by a government. These laws and regulations dictate very specifically actions and behaviors that are to be followed or prohibited and often include language on implications of non-compliance.\nProgram, budget or investment: These are implementing mechanisms that often follow from a strategy, policy or law. There is typically a well-defined set of actions outlined over a specific period of time and with a specific budgetary amount attached. A National Agricultural Investment Plan is an example, the budget within a ministry is another, investments from the private sector fit here, as well as programs launched by multilateral, public, private and NGO sectors.',
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
    // PC:17-25. Shown only when policy_type_id == 1 (PC:22, PCT:41 POLICY_TYPE_WITH_AMOUNT; PCT:256-260 clears it otherwise).
    // `policy_types` is a CLARISA list (not seeded here, not closed): id 1 "Program, budget or investment" is the form's own literal.
    // UI [required]=false (PC:23); VPC does not read it, so it is optional and not confirmed by the function.
    key: 'policy_change.usd_amount',
    label: 'USD amount',
    description: 'USD amount',
    type: 'number',
    section: SECTION,
    order: 2,
    result_types: TYPES,
    required: false,
    required_confirmed: false,
    visible_when: {
      field: 'policy_change.policy_type',
      operator: 'eq',
      value: 1,
    },
    ...FROM_2026,
    storage: { kind: 'column', table: TABLE, column: 'amount' },
  },
  {
    // PC:27-40: options hard-coded in the form (Confirmed 1, Estimated 2, Unknown 3); the column is `text` with no FK
    // (migration 1668828279144 only adds it) and no migration seeds them; the form's three ids are the closed list `policy_amount_statuses` [1, 2, 3] (stored value not guaranteed).
    // Shown only when policy_type_id == 1 (PC:33). UI [required]=false (PC:38); VPC does not read it.
    key: 'policy_change.amount_status',
    label: 'Status',
    type: 'single_select',
    control_list: 'policy_amount_statuses',
    section: SECTION,
    order: 3,
    result_types: TYPES,
    required: false,
    required_confirmed: false,
    visible_when: {
      field: 'policy_change.policy_type',
      operator: 'eq',
      value: 1,
    },
    ...FROM_2026,
    storage: { kind: 'column', table: TABLE, column: 'status_amount' },
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
    // PC:59-67 (P2-2932 AC4). The form shows it only when `showActorsInfluenced()` (PCT:87-92): Number(relatedTo) === 51
    // (PCT:81 CAPACITY_OF_ACTORS_QUESTION_ID), the "capacity development of key actors" option of `related_to`.
    // NO `visible_when` on purpose: that option's id is environment-specific (test 51; prod root 48 / options 49-50, no 51) and
    // `policy_related_questions` is matched by label, so the condition vocabulary cannot name it without inventing an id (Known gaps).
    // UI [required]=false (PC:65); VPC does not read it.
    key: 'policy_change.actors_influenced',
    label: 'Number of key actors influenced',
    description:
      'How many key actors were influenced in this policy process. This should match the contribution you report against the TOC indicator target.',
    type: 'number',
    section: SECTION,
    order: 5,
    result_types: TYPES,
    required: false,
    required_confirmed: false,
    ...FROM_2026,
    storage: { kind: 'column', table: TABLE, column: 'actors_influenced' },
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
