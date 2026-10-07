// @akili-spec quality-assurance/qa-field-catalog
// QAC-T-10 · inventory 2026-B §3.3 (`innovation_use`, pages IUI / IUF). Keys frozen as written in the inventory;
// the inventory `section` column (iu_current_use, iu_use_level, iu_projection_2030) is kept as the catalog section.
//
// Decisions (owner mandate 2026-10-06, no model change):
//  - Annual-updating `general.*` block: owned by C-1 (QAC-T-8), not repeated here.
//  - Link to an already reported innovation (`innovation_use.linked_result.*`, section iu_linked_result): NOT catalogued
//    here. The question and its result picker are `linked.has_innovation_link` / `linked.results` (QAC-T-8, ALL_TYPES,
//    which includes `innovation_use`). D15: the live function has the check commented out (VIU:53,62-74), so the function
//    does not require the answer for this type; the form does not either (optional on the Innovation Use page), so
//    `linked.has_innovation_link.required_when` names every type EXCEPT `innovation_use` and `innovation_package` (QAC-T-19). `results_innovations_use.has_innovation_link` is PENDING_CATALOG (it
//    stores the same answer as `result.has_innovation_link`).
//  - REVIEW D12 (b), as of QAC-T-19: rows that are mandatory in the form but silent in the live function are `required` /
//    `required_when` with `required_confirmed: false` (youth columns, organizations `how_many`, `yet_to_be_determined`); the
//    exceptions that stay optional because no condition can express the form's gate are `new_users_added`,
//    `use_expansion_narrative` and `projection_2030.justification` (documented gaps). `innovation_use_level` is `required: true, required_confirmed: false` since QAC-T-19: the
//    form marks it mandatory, the function does not enforce the level (NULL check commented, VIU:53; D15, D12).
//  - REVIEW D3 (a): "Organization" and "Sub-type" write the same column `institution_types_id` (the sub-type
//    overwrites the type), so there is ONE field `institution_type` with a 2-level control list `institution_types`;
//    the inventory's `institution_sub_type` rows have no key of their own (R-2: one key = one binding).
//  - REVIEW D13: the any-of group rule ("at least one of actors / organizations / other measures of the block unless
//    `yet_to_be_determined`") is carried by `required_when` on each of the three lists (`yet_to_be_determined` = false;
//    NULL is read as false); the lists carry no description (the form has no help text for them). Row-level rules of the subfields are carried by the
//    subfields' own `required` / `required_when` (QAC-R-13, QAC-T-19).
//  - REVIEW D2: the investment block (`innovation_use.investment.*`: result_initiative_budget, non_pooled_projetct_budget,
//    result_institutions_budget, reached through a parent row) is PENDING_CATALOG with the 2-hop columns (shared with
//    innovation development, QAC-T-9).
//  - QAC-T-19 (owner decision 2026-10-07, option B): `required` / `required_when` = what the 2026 FORM requires UNION what the live
//    function validation_innovation_use_P25 (VIU) states; `required_confirmed` is true only where VIU also states it. Form = the
//    shared `innovation-use-form` component (IUF = onecgiar-pr-client/src/app/shared/components/innovation-use-form/
//    innovation-use-form.component.html; first line given = current-use block, second = the 2030 block, same controls) and the
//    field config of FieldsManagerService (FM = shared/services/fields-manager.service.ts). Every list row control is
//    `[required]="!!item.id"`: required as soon as the row exists, hence `required: true` / `required_when` on the subfields.
//    Rules stated only by VIU are kept and called "function-stated" in the comment.
//  - Scaling studies (retired in 2026, IUFT:682-690) and the legacy male/female counters: PENDING_CATALOG for a 2025 load.
import {
  CatalogField,
  CatalogSection,
  CatalogSubField,
  Condition,
} from '../types';
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

/** QAC-T-19: a subfield's rule. Unconditional -> `required: true`; conditional -> `required: false` + `required_when`. */
interface SubRule {
  required?: boolean;
  required_when?: Condition;
}

const sub = (
  table: string,
  key: string,
  label: string,
  type: CatalogSubField['type'],
  column: string = key,
  control_list?: string,
  rule: SubRule = {},
): CatalogSubField => ({
  key,
  label,
  type,
  ...(control_list ? { control_list } : {}),
  required: rule.required ?? false,
  ...(rule.required_when ? { required_when: rule.required_when } : {}),
  storage: col(table, column),
});

const ALWAYS: SubRule = { required: true };
// Women / Men / Youth: shown (and required, `!!result_actors_id`) only while "Sex and age disaggregation does not apply" is off.
const WHEN_DISAGGREGATED: SubRule = {
  required_when: whenEq('sex_and_age_disaggregation', false),
};

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
  // QAC-T-19: the three list headers are `[required]="false"` in the form (IUF:86, :255, :337 / :502, :648, :735); the group
  // rule is FUNCTION-STATED (VIU:97-131 current use, :263-297 2030: with the gate off at least one of the three lists has a
  // row) and its gate flag is form-required, so the lists keep this conditional rule and `required_confirmed: true`.
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
        // IUF:100 / :515 (select, `[required]="!!result_actors_id"`); VIU:148-153 (:314-319 for 2030) reads the type of every row.
        sub(
          'result_actors',
          'actor_type',
          'Actor type',
          'single_select',
          'actor_type_id',
          'actor_types',
          ALWAYS,
        ),
        // IUF:113 / :528 (shown and required when the type is 5 "Other"); VIU:158,170 (:324,336 for 2030; `valid_text(other_actor_type)`).
        sub(
          'result_actors',
          'other_actor_type',
          'Other actor type',
          'text',
          'other_actor_type',
          undefined,
          {
            required_when: whenEq('actor_type', 5),
          },
        ),
        sub(
          'result_actors',
          'sex_and_age_disaggregation',
          'Sex and age disaggregation does not apply',
          'boolean',
        ),
        // IUF:159 / :553 and :193 / :586 (`[required]="!!result_actors_id"`, shown while the disaggregation tick is off);
        // VIU:148-153 also requires them, but only for types other than 5 — the form's wider rule (every type) is used.
        sub(
          'result_actors',
          'women',
          'Women',
          'number',
          'women',
          undefined,
          WHEN_DISAGGREGATED,
        ),
        // Form-only (IUF:168 / :562 and :202 / :595, same gate); VIU is silent on the youth counters (REVIEW D12 b).
        sub(
          'result_actors',
          'women_youth',
          'Youth (women)',
          'number',
          'women_youth',
          undefined,
          WHEN_DISAGGREGATED,
        ),
        sub(
          'result_actors',
          'men',
          'Men',
          'number',
          'men',
          undefined,
          WHEN_DISAGGREGATED,
        ),
        sub(
          'result_actors',
          'men_youth',
          'Youth (men)',
          'number',
          'men_youth',
          undefined,
          WHEN_DISAGGREGATED,
        ),
        // IUF:236 / :629 (shown and required when the disaggregation tick is on); VIU:164-170.
        sub(
          'result_actors',
          'how_many',
          'How many',
          'number',
          'how_many',
          undefined,
          {
            required_when: whenEq('sex_and_age_disaggregation', true),
          },
        ),
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
        // IUF:269 / :662 (`[required]="!!id"`, and the Sub-type select at :301 / :693 when it is offered); VIU:205-208 (:371-374 for 2030).
        sub(
          'results_by_institution_type',
          'institution_type',
          'Organization',
          'single_select',
          'institution_types_id',
          'institution_types',
          ALWAYS,
        ),
        // IUF:285 / :677 (shown and required when the type is 78 "Other"); VIU:211-214 (:377-380 for 2030).
        sub(
          'results_by_institution_type',
          'other_institution',
          'Other organization',
          'text',
          'other_institution',
          undefined,
          { required_when: whenEq('institution_type', 78) },
        ),
        // Form-only (IUF:314 / :706, `[required]="!!id"`); VIU is silent on the count.
        sub(
          'results_by_institution_type',
          'how_many',
          'How many',
          'number',
          'how_many',
          undefined,
          ALWAYS,
        ),
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
        // IUF:350 / :747 and :359 / :755 (`[required]="!!result_ip_measure_id"`); VIU:245-246 (:411-412 for 2030).
        sub(
          'result_ip_measure',
          'unit_of_measure',
          'Unit of measure',
          'text',
          'unit_of_measure',
          undefined,
          ALWAYS,
        ),
        sub(
          'result_ip_measure',
          'quantity',
          'Quantity',
          'number',
          'quantity',
          undefined,
          ALWAYS,
        ),
      ],
    },
  ];
}

export const INNOVATION_USE_FIELDS: CatalogField[] = [
  {
    // When ticked it lifts the any-of group rule of the three lists of this block (D13). QAC-T-19: the form marks the
    // radio required (FM:318-322, `required: true`; IUF:9), and `false` is an answer (the control's `hasValue` is
    // `value !== null`), so the field needs a non-null value. VIU does NOT state it: it reads NULL like 0 (VIU:97-99),
    // hence form-only, `required_confirmed: false`. (Was `required: false, required_confirmed: true`, set under the old rule
    // that `required` followed the function; the group rule itself stays on the three lists below.)
    key: 'innovation_use.current_use.yet_to_be_determined',
    label: 'This is yet to be determined',
    description:
      'Depending on the innovation, users may be groups of actors or be organizations. Multiple actors or organizations can be selected.',
    type: 'boolean',
    section: IU_CURRENT_USE_SECTION.key,
    order: 3,
    result_types: TYPES,
    required: true,
    required_confirmed: false,
    ...FROM_2026,
    storage: col(USE_TABLE, 'innov_use_to_be_determined'),
  },
  {
    // D12 (b): mandatory in the form (IUF:47-54 `[required]="true"`), no live rule -> unconfirmed. Shown only when the
    // previous phase reported actors and the current use is not "to be determined" (showCurrentUseUpdate(),
    // innovation-use-form.component.ts:202-208). 0 is a valid answer.
    // QAC-T-19 DOCUMENTED GAP: kept `required: false`. The form requires it whenever it is shown, but the gate is the
    // previous phase's reported actors, which is not a catalog field, so no `required_when` can state it without
    // asking for it on results where the form never shows it.
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
    // D12 (b): same gate and treatment as `new_users_added` (IUF:64-69 `[required]="true"`; same QAC-T-19 documented
    // gap); max 100 words.
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
    // D15 / D12: mandatory in the form (IUF:387 `[required]="true"` on the range control, completeness marker at
    // :390-394), but the live function does not enforce it (NULL check commented out, VIU:53); it only reads the level to
    // gate the explanation. QAC-T-19: `required` follows the form -> `required: true`, form-only so `required_confirmed: false`.
    key: 'innovation_use.use_level.innovation_use_level',
    label: 'How would you assess the current use level of the innovation?',
    description:
      'In case the innovation use level differs across countries or regions, we advise to assign the highest current innovation use level that can be supported by the evidence provided.',
    type: 'single_select',
    control_list: 'innovation_use_levels',
    section: IU_USE_LEVEL_SECTION.key,
    order: 26,
    result_types: TYPES,
    required: true,
    required_confirmed: false,
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
    // QAC-T-19: now form UNION function. The form shows the textarea (default `required`, no override) for levels 5-9
    // (IUF:412-416, `getUseLevelIndex() > 4 && <= 9`; the index is the level NUMBER); VIU requires it from level 6 (VIU:76-82).
    // Level 5 is form-only, so the rule is no longer fully function-stated: `required_confirmed: false`.
    required_confirmed: false,
    // Values are the clarisa use level NUMBERS (5-9), not row ids (VIU:76-82). D28 (advisory, UNVERIFIED): the form
    // control declares optionValue="level" (IUF:385) while the stored FK `innovation_use_level_id` is the level ROW id,
    // so whether the id and the level number coincide in every environment was not verified; confirm against the
    // `innovation_use_levels` data before relying on this gate. The form shows the control for levels 5-9 (IUF:414)
    // but the live function requires it only from 6. Max 50 words.
    required_when: whenIn(
      'innovation_use.use_level.innovation_use_level',
      [5, 6, 7, 8, 9],
    ),
    ...FROM_2026,
    storage: col(USE_TABLE, 'readiness_level_explanation'),
  },
  {
    // When ticked it lifts the any-of group rule of the three lists of this block (D13). QAC-T-19: required by the form
    // (FM:331-336 `required: true`; IUF:446; the question header at IUF:466 is `[required]="true"` too); VIU reads NULL like 0
    // (VIU:263-265), so form-only, `required_confirmed: false`, same reasoning as the current-use flag. The question
    // header "What is the projected innovation use by end of 2030?" is a display header, not help text.
    key: 'innovation_use.projection_2030.yet_to_be_determined',
    label: 'This is yet to be determined',
    description:
      "This projection informs CGIAR's investment case and impact modeling. It must be reviewed and, if necessary, revised annually based on current evidence.",
    type: 'boolean',
    section: IU_PROJECTION_2030_SECTION.key,
    order: 28,
    result_types: TYPES,
    required: true,
    required_confirmed: false,
    ...FROM_2026,
    storage: col(USE_TABLE, 'innov_use_2030_to_be_determined'),
  },
  {
    // D12 (b): mandatory in the form (IUF:776-783 `[required]="true"`), no live rule -> unconfirmed. Shown only when a
    // projection inherited from the previous phase is revised and changed (`projection2030JustificationRequired`).
    // QAC-T-19 DOCUMENTED GAP: kept `required: false`; the gate compares against the previous phase's projection,
    // which is not a catalog field. Max 100 words.
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
