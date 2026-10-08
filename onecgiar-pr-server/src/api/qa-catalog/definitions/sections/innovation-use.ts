// @akili-spec quality-assurance/qa-field-catalog
// QAC-T-10 · inventory 2026-B §3.3 (`innovation_use`, pages IUI / IUF). Keys frozen as written in the inventory;
// the inventory `section` column (iu_current_use, iu_use_level, iu_projection_2030) is kept as the catalog section.
//
// Decisions (owner mandate 2026-10-06, no model change):
//  - Annual-updating `general.*` block: owned by C-1 (QAC-T-8), not repeated here.
//  - Link to an already reported innovation (`innovation_use.linked_result.*`, section iu_linked_result): catalogued since QAC-T-20 as a
//    mirror of `linked.has_innovation_link` / `linked.results` (see the QAC-T-20 note (a) below). `linked.has_innovation_link.required_when`
//    names every type EXCEPT `innovation_use` and `innovation_package` (QAC-T-19); for `innovation_use` the authoritative answer is the
//    mirror key. `results_innovations_use.has_innovation_link` is bound by the mirror (it left PENDING_CATALOG).
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
//  - QAC-T-20 (owner walk-through of the 2026 form, prtest result 9755 phase 36; catalog 2026.19): the section is completed for RESULTS.
//    Citation legend: IUI = pages/results/pages/result-detail/pages/rd-result-types-pages/innovation-use-info/innovation-use-info.component.html;
//    EST = shared/components/innovation-use-form/components/estimates/estimates.component.html (+ .ts); VIU = tmp/validation_innovation_use_P25.
//    (a) MIRROR of the link question (section iu_linked_result): `innovation_use.linked_result.has_innovation_link` and
//        `innovation_use.linked_result.linked_result` (inventory 2026-B §3.3 names). The Innovation Use page asks this question for
//        phase_year >= 2026 (P2-3424, IUI:19-45) and it is the authoritative answer for an Innovation use result.
//        Storage: the linked rows are SHARED (`linked_result`, same relation as `linked.results`, so the picker is a `multi_select`: several
//        active rows can exist, the page edits only the first). The yes/no answer is stored in TWO columns: `results_innovations_use.has_innovation_link`
//        (what the Innovation Use page reads and writes, innovation-use.service.ts:179,225; bound here) and `result.has_innovation_link` (bound by
//        `linked.has_innovation_link`). The Innovation Use page does not update the result-level copy (contributors-partners.service.ts writes both
//        but is hidden for these results, CP.ts:439-445), so for this type `linked.has_innovation_link` and the `visible_when` of `linked.results`
//        may be stale.
//        Rules: the question is optional (IUI:19-31 `[required]="false"`, PO decision P2-3424; VIU:53 NULL check commented out, D15). The picker is
//        optional in the form (IUI:33-45 `[required]="false"`) but the live validation V-CP (tmp/validation_contributor_partner_P25:143-162) reads
//        `results_innovations_use.has_innovation_link` and requires at least one active `linked_result` row when it is true: `required_when` the
//        answer is true, function-stated (`required_confirmed: true`).
//    (b) INVESTMENT tables (section iu_investment): the form renders `<app-estimates-cgiar>` (innovation-use-form.component.html:788-789, inside the
//        P25 block, no gate), the shared component of the three tables; Innovation development renders its own `app-estimates` (IDI.html:228). Both
//        read the SAME rows: one per active parent row of the result (`results_by_inititiative`, `results_by_projects`, `results_by_institution`)
//        with the budget row `result_initiative_budget` / `non_pooled_projetct_budget` / `result_institutions_budget` reached by the parent id
//        (result-investment.service.ts getInvestmentPrograms|Bilateral|Partners), hence the same path bindings as innovation_dev.estimates_*.
//        The USD input is optional in the form (`requiredSections = []`, EST `[required]="isRequired(..)"`), but a row without a value or "yet to be
//        determined" is flagged (`checkValueAlert`, estimates.component.ts) and VIU:429-481 requires `kind_cash` NOT NULL for every active budget row
//        whose `is_determined` is NULL or 0 (unlike V-ID, a NULL value does not count as 0): `kind_cash` is `required_when is_determined = false`
//        (NULL read as false, as for the gates above), function-stated. `is_determined` stays optional: its half of the either-or cannot be written (no
//        negation of `eq`).
//    (c) 2026 flags: `age_disaggregation_not_available` and `youth_split_applied_by_system` (result_actors) are subfields of the CURRENT-USE actors
//        only (IUF:135-150; the 2030 block has no such control); `graduate_students` (results_by_institution_type) is a subfield of the organizations
//        of both blocks (IUF:321 / :713). Not required by the form or by VIU.
//  - Scaling studies (retired in 2026, IUFT:682-690) and the legacy male/female counters: PENDING_CATALOG for a 2025 load.
import {
  CatalogField,
  CatalogSection,
  CatalogSubField,
  Condition,
} from '../types';
import { FROM_2026, whenEq, whenIn } from './shared';
import { budgetValue } from './innovation-development';

/** IUF:321 / :713: "# of graduate students" is rendered only for the institution type 50. */
const GRADUATE_STUDENTS_TYPE = 50;

export const IU_LINKED_RESULT_SECTION: CatalogSection = {
  key: 'iu_linked_result',
  label: 'Linked innovation development result',
  order: 49,
  result_types: ['innovation_use'],
  ...FROM_2026,
};
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

export const IU_INVESTMENT_SECTION: CatalogSection = {
  key: 'iu_investment',
  label: 'Investment',
  order: 53,
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
  /** QAC-T-25: display rule, equal to `required_when` wherever both describe the same form gate. */
  visible_when?: Condition;
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
  ...(rule.visible_when ? { visible_when: rule.visible_when } : {}),
  storage: col(table, column),
});

const ALWAYS: SubRule = { required: true };
// Women / Men / Youth: shown (and required, `!!result_actors_id`) only while "Sex and age disaggregation does not apply" is off.
// QAC-T-25: the four counters are rendered only while that tick is off (IUF:152,:186,:220 current use; :547,:580,:613 2030), so `visible_when` = `required_when`.
// `how_many` is NOT gated: it is always rendered, read-only (the sum of the breakdown) while the tick is off (IUF:220-232) and typed while it is on (IUF:233).
const WHEN_DISAGGREGATED: SubRule = {
  required_when: whenEq('sex_and_age_disaggregation', false),
  visible_when: whenEq('sex_and_age_disaggregation', false),
};

// The any-of group rule (D13) has no form help text, so the three lists carry no `description`; the rule is
// expressed by `required_when` (gate = false). Approximation (D13, advisory): `whenEq(gate, false)` reads a NULL
// gate as false, and it models only "the gate is not ticked"; the live function's "at least one of the three lists
// has a row" is evaluated across the three lists and is not expressible per list, so each list is conditional
// on the gate alone.

/** QAC-T-20: the two 2026 age-fallback subfields of the current-use actors (sibling conditions). */
const currentUseActorFlags = (): CatalogSubField[] => [
  // IUF:135-141 (2026 only, `showAgeFallback()`: rendered while the tick above is off); optional checkbox, no rule in the form or in VIU.
  {
    ...sub(
      'result_actors',
      'age_disaggregation_not_available',
      'Age disaggregation not available',
      'boolean',
    ),
    visible_when: whenEq('sex_and_age_disaggregation', false),
  },
  // IUF:145-150 (inventory 2026-B row 120): system flag, set when the 50/50 youth split is applied and never typed by the reporter; the form note
  // (IUF:147-148) is shown only while it is stored true, which only happens with the fallback ticked (cleanActor / applyAgeDisaggregationFallback
  // clear it, innovation-use-form.component.ts:162-163,317).
  {
    ...sub(
      'result_actors',
      'youth_split_applied_by_system',
      'Youth and Non-youth were split 50/50 by the system',
      'boolean',
    ),
    visible_when: whenEq('age_disaggregation_not_available', true),
  },
];

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
    // QAC-T-25: each list is rendered only while its block's "yet to be determined" tick is off (IUF:18-23 current use, :471 2030). A NULL tick
    // means "not ticked" (the template tests `!body.innov_use_to_be_determined`), the same reading as `required_when` (contract known gap 11).
    visible_when: whenEq(gate, false),
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
            // IUF:112 (current use) / :527 (2030): the input exists only for the type 5
            visible_when: whenEq('actor_type', 5),
          },
        ),
        sub(
          'result_actors',
          'sex_and_age_disaggregation',
          'Sex and age disaggregation does not apply',
          'boolean',
        ),
        // CURRENT USE ONLY (IUF:135-150; the 2030 block, IUF:502-640, has neither control).
        ...(sectionId === 1 ? currentUseActorFlags() : []),
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
          {
            required_when: whenEq('institution_type', 78),
            // IUF:282 (current use) / :674 (2030): the input exists only for the type 78
            visible_when: whenEq('institution_type', 78),
          },
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
        // IUF:319-327 / :712-720 (`institution_types_id == 50`, `[required]="false"`); no rule in VIU.
        {
          ...sub(
            'results_by_institution_type',
            'graduate_students',
            '# of graduate students',
            'number',
          ),
          visible_when: whenEq('institution_type', GRADUATE_STUDENTS_TYPE),
        },
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

// ---- investment tables (EST; same rows as innovation_dev.estimates_*, see the header) ------------------------------------------------
const budgetSubfields = (
  budgetTable: string,
  parentFk: string,
): CatalogSubField[] => [
  {
    // EST:25-28 "Total USD Value (in-cash + in-kind)", optional input; VIU:429-481 needs it for every active budget row not "yet to be determined".
    key: 'kind_cash',
    label: 'Total USD Value (in-cash + in-kind)',
    type: 'number',
    required: false,
    required_when: whenEq('is_determined', false),
    storage: budgetValue(budgetTable, parentFk, 'kind_cash'),
  },
  {
    // EST:32-35 single-option radio "This is yet to be determined"
    key: 'is_determined',
    label: 'This is yet to be determined',
    type: 'boolean',
    required: false,
    storage: budgetValue(budgetTable, parentFk, 'is_determined'),
  },
];

const investmentBase = {
  section: IU_INVESTMENT_SECTION.key,
  result_types: TYPES,
  // The rows are system-provided (one per linked entity) and the tables are optional in the form; VIU states the row rule (above).
  required: false,
  required_confirmed: true,
  ...FROM_2026,
};

export const INNOVATION_USE_FIELDS: CatalogField[] = [
  {
    // Mirror of `linked.has_innovation_link` (see the header, (a)). IUI:19-31 radio, `[required]="false"`; verbatim question
    // (INNOVATION_LINK_QUESTION, qa-innovation-development-results.service.ts:16). Shown for phase_year >= 2026 only (IUI showsInnovationLink).
    key: 'innovation_use.linked_result.has_innovation_link',
    label:
      'Are you reporting the use of an innovation that has already been reported and quality assessed?',
    type: 'boolean',
    section: IU_LINKED_RESULT_SECTION.key,
    order: 1,
    result_types: TYPES,
    required: false,
    required_confirmed: false,
    ...FROM_2026,
    storage: col(USE_TABLE, 'has_innovation_link'),
  },
  {
    // Mirror of `linked.results` (same `linked_result` relation, so `multi_select` like it: several active rows can exist; the page edits only the
    // first, innovation-use-info.component.ts:157-186). IUI:33-45 (`@if has_innovation_link`, `[required]="false"`), but V-CP:143-162 (tmp/
    // validation_contributor_partner_P25) reads `results_innovations_use.has_innovation_link` and requires at least one active linked_result row
    // when it is true: FUNCTION-STATED, so `required_when` the answer is true, `required_confirmed: true`.
    key: 'innovation_use.linked_result.linked_result',
    label: 'Please select an Innovation Development result',
    type: 'multi_select',
    control_list: 'qa_innovation_dev_results',
    section: IU_LINKED_RESULT_SECTION.key,
    order: 2,
    result_types: TYPES,
    required: false,
    required_confirmed: true,
    visible_when: whenEq(
      'innovation_use.linked_result.has_innovation_link',
      true,
    ),
    required_when: whenEq(
      'innovation_use.linked_result.has_innovation_link',
      true,
    ),
    ...FROM_2026,
    storage: {
      kind: 'relation',
      table: 'linked_result',
      fk_to_result: 'origin_result_id',
      value_column: 'linked_results_id',
      filter: { is_active: 1 },
    },
  },
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
    // QAC-T-25: same gate, the textarea itself (IUF:410-418 `getUseLevelIndex() > 4 && <= 9`).
    visible_when: whenIn(
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
  {
    ...investmentBase,
    // EST:1-37 (one row per active initiative row, any role); VIU:429-444. Help text: estimates.component.ts headerDescriptions().n1 (HTML stripped).
    key: 'innovation_use.investment.programs',
    label:
      'Estimation of total USD-value of investment by CGIAR Programs during the reporting period',
    description:
      'Innovation use team estimates the total investment (in-cash + in-kind) in innovation use made by the leading Science Program/Accelerator and the contributing Science Program/Accelerator during the reporting period. Includes Science Program/Accelerator funds allocated to CGIAR and/or partners. Innovation use team works with contributing Science Program/Accelerator to estimate the total (co-) investment (in-cash + in-kind) in innovation use made by each of the contributing Science Program/Accelerator during the reporting period',
    type: 'list',
    order: 46,
    storage: {
      kind: 'relation',
      table: 'results_by_inititiative',
      fk_to_result: 'result_id',
      value_column: 'inititiative_id',
      filter: { is_active: 1 },
    },
    subfields: [
      {
        key: 'program',
        label: 'Science Program/Accelerator',
        type: 'single_select',
        control_list: 'initiatives',
        required: true,
        storage: {
          kind: 'column',
          table: 'results_by_inititiative',
          column: 'inititiative_id',
        },
      },
      ...budgetSubfields('result_initiative_budget', 'result_initiative_id'),
    ],
  },
  {
    ...investmentBase,
    // EST:57-96 (one row per active project row; projects are added in Contributors & partners); VIU:446-460. Help text: headerDescriptions().n2.
    key: 'innovation_use.investment.bilateral',
    label:
      'Estimated total USD-value of investment by CGIAR W3 or bilateral projects during the reporting period',
    description:
      'Innovation use team works with W3/ bilateral projects to estimate the total (co-) investment (in-cash + in-kind) in innovation development made by each of the contributing W3/ Bilaterals during the reporting period Includes W3/ Bilateral funds allocated to CGIAR and/or partners',
    type: 'list',
    order: 47,
    storage: {
      kind: 'relation',
      table: 'results_by_projects',
      fk_to_result: 'result_id',
      value_column: 'project_id',
      filter: { is_active: 1 },
    },
    subfields: [
      {
        key: 'project',
        label: 'Non-pooled project',
        type: 'single_select',
        control_list: 'projects',
        required: true,
        storage: {
          kind: 'column',
          table: 'results_by_projects',
          column: 'project_id',
        },
      },
      ...budgetSubfields('non_pooled_projetct_budget', 'result_project_id'),
    ],
  },
  {
    ...investmentBase,
    // EST:132-198 (one row per active institution row, any role); VIU:462-479. Help text: headerDescriptions().n3.
    key: 'innovation_use.investment.partners',
    label:
      'Estimated total USD-value of (co-)investment by partners during the reporting period',
    description:
      'Innovation use team works with partnersprojects to estimate the total (co-) investment (in-cash + in-kind) in innovation development made by each partner during the reporting period This concerns the investment of partner resources (in-cash and/or in-kind) that were not provided by CGIAR Science Program/Accelerator or projects',
    type: 'list',
    order: 48,
    storage: {
      kind: 'relation',
      table: 'results_by_institution',
      fk_to_result: 'result_id',
      value_column: 'institutions_id',
      filter: { is_active: 1 },
    },
    subfields: [
      {
        key: 'institution',
        label: 'Partner',
        type: 'single_select',
        control_list: 'institutions',
        required: true,
        storage: {
          kind: 'column',
          table: 'results_by_institution',
          column: 'institutions_id',
        },
      },
      {
        // read-only "Institution type" under the partner name (EST partners table, as innovation_dev.estimates_partners)
        key: 'partner_type',
        label: 'Institution type',
        type: 'single_select',
        control_list: 'institution_types',
        required: false,
        storage: {
          kind: 'lookup',
          source: 'clarisa.institutions',
          keys: [{ from: 'institution', to: 'id' }],
          value_column: 'institution_type_code',
        },
      },
      ...budgetSubfields('result_institutions_budget', 'result_institution_id'),
    ],
  },
];
