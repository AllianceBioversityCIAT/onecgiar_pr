// @akili-spec quality-assurance/qa-field-catalog
// QAC-T-8 · inventory 2026-A §4 C-1 (`general_information`). Keys frozen as written in the inventory.
// Stage 1 per DD-11: required (yes/cond) rows plus the rows with no live rule (REVIEW D12 b, optional).
import { CatalogField, CatalogSection } from '../types';
import {
  ALL_TYPES,
  FROM_2026,
  INNOVATION_TYPES,
  IS_REPLICATED_FIELD,
  NON_KP_TYPES,
  RESULT_TYPE_FIELD,
  whenEq,
  whenIn,
} from './shared';

export const GENERAL_INFORMATION_SECTION: CatalogSection = {
  key: 'general_information',
  label: 'General information',
  order: 10,
  result_types: ALL_TYPES,
  ...FROM_2026,
};

const SECTION = GENERAL_INFORMATION_SECTION.key;

const tagField = (
  key: string,
  label: string,
  order: number,
  column: string,
): CatalogField => ({
  key,
  label,
  type: 'single_select',
  control_list: 'tag_levels',
  section: SECTION,
  order,
  result_types: ALL_TYPES,
  required: true,
  required_confirmed: true,
  ...FROM_2026,
  storage: { kind: 'column', table: 'result', column },
});

const IMPACT_AREA_LABEL =
  'Which component of the Impact Area is this result intended to impact?';

// One control list per impact area (decided 2026-10-06, Santiago): no join filter on the binding.
const impactAreaField = (
  key: string,
  order: number,
  area: string,
  tagKey: string,
): CatalogField => ({
  key,
  label: IMPACT_AREA_LABEL,
  type: 'multi_select',
  control_list: `impact_area_components_${area}`,
  section: SECTION,
  order,
  result_types: ALL_TYPES,
  required: false,
  required_confirmed: true,
  required_when: whenEq(tagKey, 3),
  ...FROM_2026,
  storage: {
    kind: 'relation',
    table: 'result_impact_area_score',
    fk_to_result: 'result_id',
    value_column: 'impact_area_score_id',
  },
});

const ANNUAL_UPDATING_ACTIVE = {
  all: [
    whenEq('general.is_discontinued', true),
    whenEq(IS_REPLICATED_FIELD, true),
  ],
};

export const GENERAL_INFORMATION_FIELDS: CatalogField[] = [
  // Result envelope fields (owner decision 2026-10-06, reverses REVIEW D21; catalog_version 2026.6). System-set,
  // not form inputs and not a validation rule, hence `required_confirmed: false`. Bindings: result.entity.ts
  // `result_code`:66, `result_type_id`:86 (FK -> result_type), `result_level_id`:99 (FK -> result_level),
  // `created_by`:280 (NOT NULL, FK -> users), `created_date`:293, `status_id`:328 (FK -> result_status).
  // The client shows code/level/type in the breadcrumb (breadcrumb.component.html:2) and the code in the sidebar
  // (result-sections-sidebar.component.html:35); labels below follow the owner's list.
  {
    key: 'general.result_code',
    label: 'Result code',
    type: 'number',
    section: SECTION,
    order: 17,
    result_types: ALL_TYPES,
    required: true,
    required_confirmed: false,
    ...FROM_2026,
    storage: { kind: 'column', table: 'result', column: 'result_code' },
  },
  {
    key: 'general.result_type',
    label: 'Result type',
    type: 'single_select',
    control_list: 'result_types',
    section: SECTION,
    order: 2,
    result_types: ALL_TYPES,
    required: true,
    required_confirmed: false,
    ...FROM_2026,
    storage: { kind: 'column', table: 'result', column: 'result_type_id' },
  },
  {
    key: 'general.result_level',
    label: 'Result level',
    type: 'single_select',
    control_list: 'result_levels',
    section: SECTION,
    order: 1,
    result_types: ALL_TYPES,
    required: true,
    required_confirmed: false,
    ...FROM_2026,
    storage: { kind: 'column', table: 'result', column: 'result_level_id' },
  },
  {
    key: 'general.created_by',
    label: 'Created by',
    type: 'single_select',
    control_list: 'users',
    section: SECTION,
    order: 18,
    result_types: ALL_TYPES,
    required: true,
    required_confirmed: false,
    ...FROM_2026,
    storage: { kind: 'column', table: 'result', column: 'created_by' },
  },
  {
    key: 'general.created_date',
    label: 'Creation date',
    type: 'date',
    section: SECTION,
    order: 19,
    result_types: ALL_TYPES,
    required: true,
    required_confirmed: false,
    ...FROM_2026,
    storage: { kind: 'column', table: 'result', column: 'created_date' },
  },
  {
    key: 'general.status',
    label: 'Status',
    type: 'single_select',
    control_list: 'result_statuses',
    section: SECTION,
    order: 20,
    result_types: ALL_TYPES,
    required: true,
    required_confirmed: false,
    ...FROM_2026,
    storage: { kind: 'column', table: 'result', column: 'status_id' },
  },
  // Mirrors `contributors.submitter` (same stored value, same binding). GI shows it as identity, like
  // result_type / level; the form edits it in Contributors & partners. Added 2026-10-07 (owner, v1.4).
  {
    key: 'general.primary_program',
    label: 'Primary Program',
    type: 'single_select',
    control_list: 'initiatives',
    section: SECTION,
    order: 3,
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
    key: 'general.title',
    label: 'Title of Result',
    description:
      'Provide a clear, informative name of the output, for a non-specialist reader and without acronyms. Avoid abbreviations or (technical) jargon. For innovations, varieties or breeds should be described by their generic traits or characteristics (e.g. Drought tolerant and aphid resistant groundnut cultivars).',
    type: 'text',
    section: SECTION,
    order: 4,
    result_types: ALL_TYPES,
    required: true,
    required_confirmed: true,
    ...FROM_2026,
    storage: { kind: 'column', table: 'result', column: 'title' },
  },
  {
    key: 'general.description',
    label: 'Description of Result',
    description:
      'Ensure the description is understandable for a non-specialist reader. Avoid acronyms and technical jargon. Avoid repetition of the title. Varieties or breeds should be described by their generic traits or characteristics (e.g. Drought tolerant and aphid resistant groundnut cultivars).',
    type: 'text',
    section: SECTION,
    order: 5,
    result_types: ALL_TYPES,
    required: false,
    required_confirmed: true,
    // result type other than knowledge_product
    required_when: whenIn(RESULT_TYPE_FIELD, NON_KP_TYPES),
    ...FROM_2026,
    storage: { kind: 'column', table: 'result', column: 'description' },
  },
  {
    key: 'general.lead_contact_person',
    label: 'Lead contact person',
    description:
      'For more precise results, we recommend searching by email or username. Examples: j.smith@cgiar.org; jsmith; JSmith. If the person isn\'t found in the directory, click "use this name anyway" on the error message to save the name as entered — this doesn\'t link an email or role since that data only exists for directory records.',
    type: 'text',
    control_list: 'directory_users',
    section: SECTION,
    order: 6,
    result_types: ALL_TYPES,
    // Inventory: cond "phase_year >= 2026 (id or free text satisfies)". The phase gate always holds
    // for a field valid from 2026, so it collapses to required; either the free text (this field) or
    // the directory user (subfield) satisfies it.
    required: true,
    required_confirmed: true,
    ...FROM_2026,
    storage: { kind: 'column', table: 'result', column: 'lead_contact_person' },
    subfields: [
      {
        key: 'directory_user',
        label: 'Lead contact person (directory user)',
        type: 'single_select',
        control_list: 'directory_users',
        required: false,
        storage: {
          kind: 'column',
          table: 'result',
          column: 'lead_contact_person_id',
        },
      },
    ],
  },
  tagField(
    'general.gender_tag',
    'Gender equality, youth and social inclusion tag',
    7,
    'gender_tag_level_id',
  ),
  tagField(
    'general.climate_tag',
    'Climate adaptation and mitigation tag',
    9,
    'climate_change_tag_level_id',
  ),
  tagField(
    'general.nutrition_tag',
    'Nutrition, health and food security tag',
    11,
    'nutrition_tag_level_id',
  ),
  tagField(
    'general.environment_tag',
    'Environmental health and biodiversity tag',
    13,
    'environmental_biodiversity_tag_level_id',
  ),
  tagField(
    'general.poverty_tag',
    'Poverty reduction, livelihoods and jobs tag',
    15,
    'poverty_tag_level_id',
  ),
  impactAreaField(
    'general.gender_impact_areas',
    8,
    'gender',
    'general.gender_tag',
  ),
  impactAreaField(
    'general.climate_impact_areas',
    10,
    'climate',
    'general.climate_tag',
  ),
  impactAreaField(
    'general.nutrition_impact_areas',
    12,
    'nutrition',
    'general.nutrition_tag',
  ),
  impactAreaField(
    'general.environment_impact_areas',
    14,
    'environmental',
    'general.environment_tag',
  ),
  impactAreaField(
    'general.poverty_impact_areas',
    16,
    'poverty',
    'general.poverty_tag',
  ),
  // Annual-updating block (inventory C-1 rows 14-17). The inventory names C-1 as the single owner of
  // these keys (REVIEW D7) and applies them per result type through `result_types`.
  {
    key: 'general.is_discontinued',
    label: 'Is this innovation active and receiving investment?',
    type: 'boolean',
    section: SECTION,
    order: 21,
    result_types: INNOVATION_TYPES,
    required: false,
    required_confirmed: true,
    required_when: whenEq(IS_REPLICATED_FIELD, true),
    ...FROM_2026,
    storage: { kind: 'column', table: 'result', column: 'is_discontinued' },
  },
  {
    key: 'general.discontinued_reasons',
    label: 'What are the main reasons this innovation is inactive?',
    type: 'multi_select',
    control_list: 'discontinued_reasons',
    section: SECTION,
    order: 22,
    result_types: INNOVATION_TYPES,
    required: false,
    required_confirmed: true,
    required_when: ANNUAL_UPDATING_ACTIVE,
    ...FROM_2026,
    storage: {
      kind: 'relation',
      table: 'results_investment_discontinued_options',
      fk_to_result: 'result_id',
      value_column: 'investment_discontinued_option_id',
    },
    subfields: [
      {
        key: 'description',
        label: 'Enter text',
        type: 'text',
        // required only when the chosen reason is "Other" (subfields carry no required_when)
        required: false,
        storage: {
          kind: 'column',
          table: 'results_investment_discontinued_options',
          column: 'description',
        },
      },
    ],
  },
  {
    key: 'general.merge_targets',
    label: 'Which innovations did this one merge into?',
    description: 'Only active, non-discontinued innovations can be selected.',
    type: 'multi_select',
    control_list: 'results',
    section: SECTION,
    order: 23,
    result_types: ['innovation_development'],
    required: false,
    required_confirmed: false,
    ...FROM_2026,
    storage: {
      kind: 'relation',
      table: 'result_innovation_merge_split',
      fk_to_result: 'origin_result_id',
      value_column: 'target_result_id',
      filter: { transition_type: 'merge' },
    },
  },
  {
    key: 'general.split_targets',
    label: 'Which innovations did this one split into?',
    description: 'Only active, non-discontinued innovations can be selected.',
    type: 'multi_select',
    control_list: 'results',
    section: SECTION,
    order: 24,
    result_types: ['innovation_development'],
    required: false,
    required_confirmed: false,
    ...FROM_2026,
    storage: {
      kind: 'relation',
      table: 'result_innovation_merge_split',
      fk_to_result: 'origin_result_id',
      value_column: 'target_result_id',
      filter: { transition_type: 'split' },
    },
  },
  // Flag that gates the annual-updating block (`rd-general-information.component.html:2`, only for result types 7
  // and 2 per the annual-updating guide). It is stored on every result but the form never shows it as an input, so
  // the label is the catalog's own wording, not a client string. Catalogued (T-14 review) so the three
  // annual-updating conditions reference a real key instead of a pseudo-key.
  {
    key: 'general.is_replicated',
    label: 'Is this a replicated innovation?',
    type: 'boolean',
    section: SECTION,
    order: 25,
    result_types: INNOVATION_TYPES,
    required: false,
    required_confirmed: false,
    ...FROM_2026,
    storage: { kind: 'column', table: 'result', column: 'is_replicated' },
  },
];
