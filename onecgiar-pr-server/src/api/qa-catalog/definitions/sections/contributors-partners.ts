// @akili-spec quality-assurance/qa-field-catalog
// QAC-T-8 · inventory 2026-A §4 C-3 (`contributors_partners`). Keys frozen as written in the inventory.
// Optional rows with a live rule absent are stage 2 (PENDING_CATALOG); rows with no live rule enter
// stage 1 as optional and unconfirmed (REVIEW D12 b).
// Merged 2026-10-06 (owner decision, reverses REVIEW D6 for ToC and linked results; catalog_version 2026.6): the former
// `toc_alignment` section (QAC-T-8 · inventory C-2, keys `toc.*` frozen) now lives here. Deferred to
// PENDING_CATALOG (see pending-catalog.ts): `toc.entries.indicator` and `toc.entries.contribution_to_target`
// (2-hop bindings, REVIEW D2).
// 2026-10-07 (owner): `contributors.submitter` moved to `general_information` (label "Primary Program"); orders here start at 1.
// `order` follows the client page (rd-contributors-and-partners.component.html, "CP.html"): submitter :9-13,
// ToC block :38-95 (planned_result :38, invested resources :51, entries :67, narrative :83), centers :98+,
// lead center :251, bilateral projects :270-325, partners/lead partner :556-575. The former `linked_results` section (QAC-T-8 · C-6) is merged here too, after the partners block (:586-634).
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
    key: 'toc.planned_result',
    label: 'Can this result be mapped to a ToC KPI?',
    description:
      "If Yes, please select the relevant level, KPI, and indicate the result contribution to the target. If No, please provide a short justification explaining why this result is being reported outside the 2026 ToC KPI. No-mapped results will be shared with the Program team for consideration as part of the adaptive management process, and may feed into updates to the Program's 2027 ToC.",
    type: 'boolean',
    section: SECTION,
    order: 1,
    result_types: ALL_TYPES,
    required: true,
    required_confirmed: true,
    ...FROM_2026,
    storage: {
      kind: 'column',
      table: 'results_toc_result',
      column: 'planned_result',
    },
  },
  {
    key: 'toc.program_invested_financial_resources',
    label:
      'Did the Program invest financial resources in the achievement of this result?',
    description:
      "Select 'Yes' if direct program funds were utilized to achieve this result. Select 'No' if the result was achieved organically (e.g., policy influence) without financial investment from the program.",
    type: 'boolean',
    section: SECTION,
    order: 2,
    result_types: ALL_TYPES,
    // No live rule (client-only): the client requires it when the result is not mapped to a ToC KPI.
    required: false,
    required_confirmed: false,
    required_when: whenEq('toc.planned_result', false),
    ...FROM_2026,
    storage: {
      kind: 'column',
      table: 'results_toc_result',
      column: 'program_invested_financial_resources',
    },
  },
  {
    key: 'toc.narrative',
    label: 'Why is the result being reported?',
    type: 'text',
    section: SECTION,
    order: 4,
    result_types: ALL_TYPES,
    required: false,
    required_confirmed: true,
    required_when: whenEq('toc.planned_result', false),
    ...FROM_2026,
    storage: {
      kind: 'column',
      table: 'results_toc_result',
      column: 'toc_progressive_narrative',
    },
  },
  {
    key: 'toc.entries',
    label: 'ToC contributions',
    type: 'list',
    section: SECTION,
    order: 3,
    result_types: ALL_TYPES,
    required: false,
    required_confirmed: true,
    required_when: whenEq('toc.planned_result', true),
    ...FROM_2026,
    storage: {
      kind: 'relation',
      table: 'results_toc_result',
      fk_to_result: 'results_id',
      value_column: 'result_toc_result_id',
      filter: { is_active: 1 },
    },
    subfields: [
      {
        key: 'level',
        label: 'Level',
        type: 'single_select',
        control_list: 'toc_levels',
        // no live rule (owner: validation_toc_P25 not needed); the client requires it
        required: false,
        storage: {
          kind: 'column',
          table: 'results_toc_result',
          column: 'toc_level_id',
        },
      },
      {
        key: 'toc_result',
        label: 'ToC result',
        type: 'single_select',
        control_list: 'toc_results',
        required: false,
        storage: {
          kind: 'column',
          table: 'results_toc_result',
          column: 'toc_result_id',
        },
      },
    ],
  },
  {
    key: 'contributors.centers',
    label: 'Contributing CGIAR Centers',
    description:
      "The CGIAR Centers listed below were identified in your 2026 ToC. To select a different Center, choose 'Other' from the drop-down menu and then make your selection from the options that appear.",
    type: 'multi_select',
    control_list: 'centers',
    section: SECTION,
    order: 5,
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
    order: 6,
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
    key: 'contributors.bilateral_projects',
    label: 'Contributing W3 and/or bilateral projects',
    type: 'multi_select',
    control_list: 'projects',
    section: SECTION,
    order: 7,
    result_types: ALL_TYPES,
    // no live rule (validation_contributor_partner_P25 never reads results_by_projects); the client marks it
    // optional ([required]="false", CP.html:274) and disables it until a ToC result is mapped (CP.html:327-355).
    // A plain multi-select: the form has no per-project percentage and no lead flag (results_by_projects.
    // contribution_percentage stays PENDING_CATALOG, is_lead stays NOT_FOR_QA).
    required: false,
    required_confirmed: false,
    ...FROM_2026,
    storage: {
      kind: 'relation',
      table: 'results_by_projects',
      fk_to_result: 'result_id',
      value_column: 'project_id',
      filter: { is_active: 1 },
    },
  },
  {
    key: 'partners.not_applicable',
    label: 'Not applicable',
    description: 'Select this option if the partner section is not applicable',
    type: 'boolean',
    section: SECTION,
    order: 8,
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
    order: 9,
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
    order: 10,
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
    order: 11,
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
  // Linked-result question (former `linked_results` section, QAC-T-8 · inventory C-6). On the client it lives
  // inside this page, after the partners block: rd-contributors-and-partners.component.html:586-634 (question)
  // and :634+ (result picker). Innovation use (2026+) renders the SAME stored answer on its own page
  // (innovation-use-info.component.html:20,33-44, picker label "Please select an Innovation Development
  // result"); it keeps this single key (no new keys).
  {
    key: 'linked.has_innovation_link',
    label:
      'Is this result linked or bundled with another CGIAR-reported result (such as innovation, KP, policy, etc.)?',
    type: 'boolean',
    section: SECTION,
    order: 13,
    result_types: ALL_TYPES,
    // Live rule only for innovation_development; other types have no live rule (client-only required).
    required: false,
    required_confirmed: true,
    required_when: whenEq('result_type', 'innovation_development'),
    ...FROM_2026,
    storage: { kind: 'column', table: 'result', column: 'has_innovation_link' },
  },
  {
    key: 'linked.results',
    label: 'Please select a result:',
    type: 'multi_select',
    control_list: 'results',
    section: SECTION,
    order: 14,
    result_types: ALL_TYPES,
    required: false,
    required_confirmed: true,
    required_when: whenEq('linked.has_innovation_link', true),
    ...FROM_2026,
    storage: {
      kind: 'relation',
      table: 'linked_result',
      fk_to_result: 'origin_result_id',
      value_column: 'linked_results_id',
      filter: { is_active: 1 },
    },
  },
];
