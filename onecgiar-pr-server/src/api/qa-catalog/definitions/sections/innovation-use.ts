// @akili-spec quality-assurance/qa-field-catalog
// QAC-T-10 · inventory 2026-B §3.3 (`innovation_use`, pages IUI / IUF). Keys frozen as written in the inventory;
// the inventory `section` column (iu_current_use, iu_use_level, iu_projection_2030) is kept as the catalog section.
//
// Decisions (owner mandate 2026-10-06, no model change):
//  - Annual-updating `general.*` block: owned by C-1 (QAC-T-8), not repeated here.
//  - Link to an already reported innovation (`innovation_use.linked_result.*`, section iu_linked_result): NOT catalogued
//    here. The question and its result picker are `linked.has_innovation_link` / `linked.results` (QAC-T-8, ALL_TYPES,
//    which includes `innovation_use`). D15: the live function has the check commented out (VIU:53,62-74), so the answer is
//    not required for this type (`linked.has_innovation_link.required_when` names only `innovation_development`;
//    confirmed from the function as written). `results_innovations_use.has_innovation_link` is PENDING_CATALOG (it
//    stores the same answer as `result.has_innovation_link`).
//  - REVIEW D12 (b): rows that are mandatory in the form but silent in the live function enter stage 1 as optional and
//    unconfirmed (`new_users_added`, `use_expansion_narrative`, `projection_2030.justification`, youth columns,
//    organizations `how_many`). `innovation_use_level` is `required: false, required_confirmed: true`: the function
//    states it does not enforce the level (NULL check commented, VIU:53), the form marks it mandatory (D15, D12).
//  - REVIEW D3 (a): "Organization" and "Sub-type" write the same column `institution_types_id` (the sub-type
//    overwrites the type), so there is ONE field `institution_type` with a 2-level control list `institution_types`;
//    the inventory's `institution_sub_type` rows have no key of their own (R-2: one key = one binding).
//  - REVIEW D13: the any-of group rule ("at least one of actors / organizations / other measures of the block unless
//    `yet_to_be_determined`") is carried by `required_when` on each of the three lists (`yet_to_be_determined` = false;
//    NULL is read as false); the lists carry no description (the form has no help text for them). Row-level rules of the subfields stay in the inventory
//    (subfields carry no `required_when`, QAC-R-5 amended).
//  - REVIEW D2: the investment block (`innovation_use.investment.*`: result_initiative_budget, non_pooled_projetct_budget,
//    result_institutions_budget, reached through a parent row) is PENDING_CATALOG with the 2-hop columns (shared with
//    innovation development, QAC-T-9).
//  - Scaling studies (retired in 2026, IUFT:682-690) and the legacy male/female counters: PENDING_CATALOG for a 2025 load.
import { CatalogField, CatalogSection, CatalogSubField } from '../types';
import { FROM_2026, whenEq, whenIn } from './shared';

export const IU_CURRENT_USE_SECTION: CatalogSection = {
  key: 'iu_current_use',
  label: 'Current use',
  order: 50,
  result_types: ['innovation_use'],
  ...FROM_2026,
};
export const IU_USE_LEVEL_SECTION: CatalogSection = {
  key: 'iu_use_level',
  label: 'Use level',
  order: 51,
  result_types: ['innovation_use'],
  ...FROM_2026,
};
export const IU_PROJECTION_2030_SECTION: CatalogSection = {
  key: 'iu_projection_2030',
  label: '2030 use projection',
  order: 52,
  result_types: ['innovation_use'],
  ...FROM_2026,
};

const TYPES = ['innovation_use'];
const USE_TABLE = 'results_innovations_use';

const col = (table: string, column: string) => ({
  kind: 'column' as const,
  table,
  column,
});

const sub = (
  table: string,
  key: string,
  label: string,
  type: CatalogSubField['type'],
  column: string = key,
  control_list?: string,
): CatalogSubField => ({
  key,
  label,
  type,
  ...(control_list ? { control_list } : {}),
  required: false,
  storage: col(table, column),
});

// The any-of group rule (D13) has no form help text, so the three lists carry no `description`; the rule is
// expressed by `required_when` (gate = false). Approximation (D13, advisory): `whenEq(gate, false)` reads a NULL
// gate as false, and it models only "the gate is not ticked"; the live function's "at least one of the three lists
// has a row" is evaluated across the three lists and is not expressible per list, so each list is conditional
// on the gate alone.

/** Actors / organizations / measures lists of one block (section_id 1 = current use, 2 = 2030 projection). */
function usageLists(
  section: string,
  prefix: string,
  sectionId: number,
  orders: [number, number, number],
  gate: string,
): CatalogField[] {
  const base = {
    section,
    result_types: TYPES,
    required: false,
    required_confirmed: true,
    required_when: whenEq(gate, false),
    ...FROM_2026,
  };
  return [
    {
      ...base,
      key: `${prefix}.actors`,
      label: 'Actors',
      type: 'list',
      order: orders[0],
      storage: {
        kind: 'relation',
        table: 'result_actors',
        fk_to_result: 'result_id',
        value_column: 'result_actors_id',
        filter: { section_id: sectionId, is_active: 1 },
      },
      subfields: [
        sub(
          'result_actors',
          'actor_type',
          'Actor type',
          'single_select',
          'actor_type_id',
          'actor_types',
        ),
        sub('result_actors', 'other_actor_type', 'Other actor type', 'text'),
        sub(
          'result_actors',
          'sex_and_age_disaggregation',
          'Sex and age disaggregation does not apply',
          'boolean',
        ),
        sub('result_actors', 'women', 'Women', 'number'),
        // UI-mandatory but not tested by the live function (REVIEW D12 b): optional, unconfirmed.
        sub('result_actors', 'women_youth', 'Youth (women)', 'number'),
        sub('result_actors', 'men', 'Men', 'number'),
        sub('result_actors', 'men_youth', 'Youth (men)', 'number'),
        sub('result_actors', 'how_many', 'How many', 'number'),
      ],
    },
    {
      ...base,
      key: `${prefix}.organizations`,
      label: 'Organizations',
      type: 'list',
      order: orders[1],
      storage: {
        kind: 'relation',
        table: 'results_by_institution_type',
        fk_to_result: 'results_id',
        value_column: 'institution_types_id',
        filter: {
          institution_roles_id: 5,
          section_id: sectionId,
          is_active: 1,
        },
      },
      subfields: [
        // D3 (a): the form's "Organization" and "Sub-type" both write `institution_types_id`.
        sub(
          'results_by_institution_type',
          'institution_type',
          'Organization',
          'single_select',
          'institution_types_id',
          'institution_types',
        ),
        sub(
          'results_by_institution_type',
          'other_institution',
          'Other organization',
          'text',
        ),
        sub('results_by_institution_type', 'how_many', 'How many', 'number'),
      ],
    },
    {
      ...base,
      key: `${prefix}.measures`,
      label:
        'Other quantitative measures of innovation use (e.g. # of hectares)',
      type: 'list',
      order: orders[2],
      storage: {
        kind: 'relation',
        table: 'result_ip_measure',
        fk_to_result: 'result_id',
        value_column: 'unit_of_measure',
        filter: { section_id: sectionId, is_active: 1 },
      },
      subfields: [
        sub('result_ip_measure', 'unit_of_measure', 'Unit of measure', 'text'),
        sub('result_ip_measure', 'quantity', 'Quantity', 'number'),
      ],
    },
  ];
}

export const INNOVATION_USE_FIELDS: CatalogField[] = [
  {
    // Optional itself; when ticked it lifts the any-of group rule of the three lists of this block (D13).
    key: 'innovation_use.current_use.yet_to_be_determined',
    label: 'This is yet to be determined',
    description:
      'Depending on the innovation, users may be groups of actors or be organizations. Multiple actors or organizations can be selected.',
    type: 'boolean',
    section: IU_CURRENT_USE_SECTION.key,
    order: 3,
    result_types: TYPES,
    required: false,
    required_confirmed: true,
    ...FROM_2026,
    storage: col(USE_TABLE, 'innov_use_to_be_determined'),
  },
  {
    // D12 (b): mandatory in the form (UI [required]=true), no live rule -> optional, unconfirmed. Shown only when the
    // previous phase reported actors (IUFT:202-208). 0 is a valid answer.
    key: 'innovation_use.current_use_update.new_users_added',
    label: 'New users added during this reporting period',
    type: 'number',
    section: IU_CURRENT_USE_SECTION.key,
    order: 4,
    result_types: TYPES,
    required: false,
    required_confirmed: false,
    ...FROM_2026,
    storage: col(USE_TABLE, 'new_users_added'),
  },
  {
    // D12 (b): same gate and treatment as `new_users_added`; max 100 words (IUF:69).
    key: 'innovation_use.current_use_update.use_expansion_narrative',
    label: 'Brief narrative on how the use expanded',
    type: 'text',
    section: IU_CURRENT_USE_SECTION.key,
    order: 5,
    result_types: TYPES,
    required: false,
    required_confirmed: false,
    ...FROM_2026,
    storage: col(USE_TABLE, 'use_expansion_narrative'),
  },
  ...usageLists(
    IU_CURRENT_USE_SECTION.key,
    'innovation_use.current_use',
    1,
    [6, 17, 23],
    'innovation_use.current_use.yet_to_be_determined',
  ),
  {
    // D15 / D12: mandatory in the form, but the live function does not enforce it (NULL check commented out, VIU:53);
    // it only reads the level to gate the explanation. Hence `required: false, required_confirmed: true`.
    key: 'innovation_use.use_level.innovation_use_level',
    label: 'How would you assess the current use level of the innovation?',
    description:
      'In case the innovation use level differs across countries or regions, we advise to assign the highest current innovation use level that can be supported by the evidence provided.',
    type: 'single_select',
    control_list: 'innovation_use_levels',
    section: IU_USE_LEVEL_SECTION.key,
    order: 26,
    result_types: TYPES,
    required: false,
    required_confirmed: true,
    ...FROM_2026,
    storage: col(USE_TABLE, 'innovation_use_level_id'),
  },
  {
    key: 'innovation_use.use_level.readiness_level_explanation',
    label:
      'Provide a brief explanation of how the provided evidence/documentation (URL provided under Section 4) justifies the chosen innovation use level',
    description:
      'Example: We selected Level 6 because the climate-smart maize drying technology is now being used by farmer cooperatives and individual processors who were not directly connected to the organizations involved in the initial innovation development. This reflects diffusion beyond project-supported activities and demonstrates that the innovation is being adopted through peer learning and local adaptation mechanisms. Although the innovation is being applied independently of the original partners, its use remains limited to a minority of potential users. This pattern of selective but autonomous uptake is consistent with Level 6, where adoption has extended beyond initial networks but has not yet reached broad or mainstream use.',
    type: 'text',
    section: IU_USE_LEVEL_SECTION.key,
    order: 27,
    result_types: TYPES,
    required: false,
    required_confirmed: true,
    // Values are the clarisa use level NUMBERS (>= 6), not row ids (VIU:76-82). D28 (advisory, UNVERIFIED): the form
    // control declares optionValue="level" (IUF:385) while the stored FK `innovation_use_level_id` is the level ROW id,
    // so whether the id and the level number coincide in every environment was not verified; confirm against the
    // `innovation_use_levels` data before relying on this gate. The form shows the control for levels 5-9 (IUF:414)
    // but the live function requires it only from 6. Max 50 words.
    required_when: whenIn(
      'innovation_use.use_level.innovation_use_level',
      [6, 7, 8, 9],
    ),
    ...FROM_2026,
    storage: col(USE_TABLE, 'readiness_level_explanation'),
  },
  {
    // Optional itself; when ticked it lifts the any-of group rule of the three lists of this block (D13). The
    // question header "What is the projected innovation use by end of 2030?" is a display header, not help text.
    key: 'innovation_use.projection_2030.yet_to_be_determined',
    label: 'This is yet to be determined',
    description:
      "This projection informs CGIAR's investment case and impact modeling. It must be reviewed and, if necessary, revised annually based on current evidence.",
    type: 'boolean',
    section: IU_PROJECTION_2030_SECTION.key,
    order: 28,
    result_types: TYPES,
    required: false,
    required_confirmed: true,
    ...FROM_2026,
    storage: col(USE_TABLE, 'innov_use_2030_to_be_determined'),
  },
  {
    // D12 (b): mandatory in the form, no live rule -> optional, unconfirmed. Shown only when a projection inherited
    // from the previous phase is revised and changed (IUF:476-494,776). Max 100 words.
    key: 'innovation_use.projection_2030.justification',
    label: 'Please justify the change to the 2030 projection',
    type: 'text',
    section: IU_PROJECTION_2030_SECTION.key,
    order: 29,
    result_types: TYPES,
    required: false,
    required_confirmed: false,
    ...FROM_2026,
    storage: col(USE_TABLE, 'innov_use_2030_justification'),
  },
  ...usageLists(
    IU_PROJECTION_2030_SECTION.key,
    'innovation_use.projection_2030',
    2,
    [30, 39, 45],
    'innovation_use.projection_2030.yet_to_be_determined',
  ),
];
