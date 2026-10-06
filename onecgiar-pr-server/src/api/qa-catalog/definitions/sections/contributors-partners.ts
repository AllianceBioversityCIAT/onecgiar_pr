// @akili-spec quality-assurance/qa-field-catalog
// QAC-T-8 · inventory 2026-A §4 C-3 (`contributors_partners`). Keys frozen as written in the inventory.
// Optional rows with a live rule absent are stage 2 (PENDING_CATALOG); rows with no live rule enter
// stage 1 as optional and unconfirmed (REVIEW D12 b).
import { CatalogField, CatalogSection } from '../types';
import { ALL_TYPES, FROM_2026, NON_KP_TYPES, whenEq } from './shared';

export const CONTRIBUTORS_PARTNERS_SECTION: CatalogSection = {
  key: 'contributors_partners',
  label: 'Contributors & partners',
  order: 30,
  result_types: ALL_TYPES,
  ...FROM_2026,
};

const SECTION = CONTRIBUTORS_PARTNERS_SECTION.key;

export const CONTRIBUTORS_PARTNERS_FIELDS: CatalogField[] = [
  {
    key: 'contributors.submitter',
    label: 'Submitter',
    type: 'single_select',
    control_list: 'initiatives',
    section: SECTION,
    order: 1,
    result_types: ALL_TYPES,
    // no live rule (owner: function not needed); the client requires it by default
    required: false,
    required_confirmed: false,
    ...FROM_2026,
    storage: {
      kind: 'relation',
      table: 'results_by_inititiative',
      fk_to_result: 'result_id',
      value_column: 'inititiative_id',
      filter: { initiative_role_id: 1 },
    },
  },
  {
    key: 'contributors.centers',
    label: 'Contributing CGIAR Centers',
    description:
      "The CGIAR Centers listed below were identified in your 2026 ToC. To select a different Center, choose 'Other' from the drop-down menu and then make your selection from the options that appear.",
    type: 'multi_select',
    control_list: 'centers',
    section: SECTION,
    order: 2,
    result_types: ALL_TYPES,
    // no live rule: the live function has the center check commented out (V-CP:124-132)
    required: false,
    required_confirmed: false,
    ...FROM_2026,
    storage: {
      kind: 'relation',
      table: 'results_center',
      fk_to_result: 'result_id',
      value_column: 'center_id',
      filter: { is_active: 1 },
    },
  },
  {
    key: 'contributors.lead_center',
    label: 'Lead center',
    description: 'Please select the CG Center leading this result.',
    type: 'single_select',
    control_list: 'centers',
    section: SECTION,
    order: 3,
    result_types: ALL_TYPES,
    // no live rule: the live function has the lead-center check commented out (V-CP:121-132,176)
    required: false,
    required_confirmed: false,
    ...FROM_2026,
    storage: {
      kind: 'relation',
      table: 'results_center',
      fk_to_result: 'result_id',
      value_column: 'is_leading_result',
    },
  },
  {
    key: 'partners.not_applicable',
    label: 'Not applicable',
    description: 'Select this option if the partner section is not applicable',
    type: 'boolean',
    section: SECTION,
    order: 7,
    result_types: ALL_TYPES,
    required: true,
    required_confirmed: true,
    ...FROM_2026,
    storage: {
      kind: 'column',
      table: 'result',
      column: 'no_applicable_partner',
    },
  },
  {
    key: 'partners.external_partners',
    label: 'External partners',
    description:
      'Partner information is inherited/sourced from the HLO/Outcome level in the ToC. Please review this list before saving — remove any partner that does not apply to this specific result, or add the ones that do.',
    type: 'multi_select',
    control_list: 'institutions',
    section: SECTION,
    order: 8,
    result_types: NON_KP_TYPES,
    required: false,
    required_confirmed: true,
    required_when: whenEq('partners.not_applicable', false),
    ...FROM_2026,
    storage: {
      kind: 'relation',
      table: 'results_by_institution',
      fk_to_result: 'result_id',
      value_column: 'institutions_id',
      filter: { institution_roles_id: 2, is_active: 1 },
    },
  },
  {
    key: 'partners.is_lead_by_partner',
    label: 'Is this result being led by an external partner?',
    type: 'boolean',
    section: SECTION,
    order: 9,
    result_types: ALL_TYPES,
    required: false,
    required_confirmed: true,
    required_when: whenEq('partners.not_applicable', false),
    ...FROM_2026,
    storage: {
      kind: 'column',
      table: 'result',
      column: 'is_lead_by_partner',
    },
  },
  {
    key: 'partners.lead_partner',
    label: 'Lead partner',
    description:
      'Please select the partner leading this result. Only partners already added in this section can be selected as the result lead.',
    type: 'single_select',
    control_list: 'institutions',
    section: SECTION,
    order: 10,
    result_types: ALL_TYPES,
    required: false,
    required_confirmed: true,
    required_when: whenEq('partners.is_lead_by_partner', true),
    ...FROM_2026,
    storage: {
      kind: 'relation',
      table: 'results_by_institution',
      fk_to_result: 'result_id',
      value_column: 'is_leading_result',
    },
  },
  {
    key: 'partners.kp_additional_partners',
    label: 'Partners',
    type: 'multi_select',
    control_list: 'institutions',
    section: SECTION,
    order: 12,
    result_types: ['knowledge_product'],
    required: false,
    required_confirmed: true,
    required_when: whenEq('partners.not_applicable', false),
    ...FROM_2026,
    storage: {
      kind: 'relation',
      table: 'results_by_institution',
      fk_to_result: 'result_id',
      value_column: 'institutions_id',
      filter: { institution_roles_id: 8, is_active: 1 },
    },
  },
];
