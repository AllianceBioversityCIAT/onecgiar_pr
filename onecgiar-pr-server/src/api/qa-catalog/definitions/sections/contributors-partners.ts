// @akili-spec quality-assurance/qa-field-catalog
// QAC-T-8 · inventory 2026-A §4 C-3 (`contributors_partners`). Keys frozen as written in the inventory.
// Optional rows with a live rule absent are stage 2 (PENDING_CATALOG); rows with no live rule enter
// stage 1 as optional and unconfirmed (REVIEW D12 b).
// Merged 2026-10-06 (owner decision, reverses REVIEW D6 for ToC and linked results; catalog_version 2026.6): the former
// `toc_alignment` section (QAC-T-8 · inventory C-2, keys `toc.*` frozen) now lives here.
// 2026-10-07 (owner, v1.4): `contributors.submitter` is back here (form label "Submitter", first on the page); `general.primary_program` mirrors it in `general_information`.
//
// QAC-T-15 (owner field list 2026-10-07, catalog 2026.11): the section is fully parametrized. `order` follows the OWNER's
// list (not the client's DOM order, which puts the lead center after the centers dropdowns and "invested resources"
// before "Multiple WPs"): submitter, planned result, Multiple WPs, invested resources, narrative, lead center,
// contributing centers (ToC), other(s) centers, Science Program/Accelerator, bilateral projects, partners block,
// linked block, KP-only partners, KP author affiliations (QAC-T-22). Orders run 1..19 (QAC-T-27 inserted `contributors.ipsr_centers` at 9).
//
// Citation legend (all paths under onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/):
//   CP.html  = rd-contributors-and-partners.component.html     CP.ts  = rd-contributors-and-partners.component.ts
//   MWC.html = components/multiple-wps/components/multiple-wps-content/multiple-wps-content.component.html (MWC.ts = .ts)
//   MWP.html = components/multiple-wps/multiple-wps.component.html
//   NS.html  = components/multiple-wps/components/normal-selector/normal-selector.component.html
//   V-CP     = tmp/validation_contributor_partner_P25 (live P25 function, `required_confirmed: true` only when it states the rule)
//
// Gates: every field here is valid from 2026 (`FROM_2026`), which is the client's `isCP2026()` phase gate
// (CP.ts:421, fields-manager `isContributorsPartners2026`); the 2025 form is a different, legacy layout.
//
// Not expressible as catalog data (recorded, not invented):
//  - "Other(s)" dropdowns appear when the user picks the "Other(s)" sentinel or when the ToC returned no reference
//    centers / programs / partners (CP.html:179-184, :487; NS.html:195). That depends on UI state and on ToC reference data,
//    not on a catalog key, so `contributors.other_centers` carries no `visible_when`.
//  - "Why is the result being reported?" is hidden for initiative 41 in P25 (CP.ts:415-418). A condition cannot negate an
//    equality or name a program id, so only `planned_result = false` is stated; the live function still requires the narrative
//    (V-CP:30-32), which is what `required_when` records.
//  - QAC-T-19 (option B, catalog 2026.18): `required` / `required_when` = what the 2026 FORM requires UNION what the live function
//    states. `required_confirmed: true` (top-level only; subfields have no flag) only where V-CP also states the rule; a form-only rule
//    keeps `required_confirmed: false` and cites the form; a rule stated only by the function is kept and marked "function-stated".
//    Control defaults checked in the client: pr-select / pr-multi-select / pr-yes-or-not / pr-radio-button / pr-textarea / pr-input
//    default `required = true` (`[required]="false"` opts out); the identity of an element (program of a Science Program row,
//    institution of a partner row) is `required: true` because the element cannot exist without it.
// QAC-T-15 rework (catalog 2026.12): path steps join on column PAIRS (result AND initiative), so `toc.*` and the Science Program ToC
//    rows are scoped to one initiative; lookups declare their key columns (alternatives) and qualifiers (target year).
import {
  Condition,
  CatalogField,
  CatalogSection,
  CatalogSubField,
  PHASE_YEAR,
  PathBinding,
  PathStep,
  StorageBinding,
} from '../types';
import {
  ALL_TYPES,
  FROM_2026,
  NON_IPSR_TYPES,
  NON_KP_TYPES,
  RESULT_TYPE_FIELD,
  whenEq,
  whenIn,
} from './shared';

export const CONTRIBUTORS_PARTNERS_SECTION: CatalogSection = {
  key: 'contributors_partners',
  label: 'Contributors & partners',
  order: 30,
  result_types: ALL_TYPES,
  ...FROM_2026,
};

const SECTION = CONTRIBUTORS_PARTNERS_SECTION.key;

const notNull = (field: string): Condition => ({
  field,
  operator: 'not_null',
});

/**
 * Start of the submitter-scoped ToC paths (DD-13): `result` -> the result's submitter row (`initiative_role_id = 1`) in
 * `results_by_inititiative`. The server keeps the submitter's ToC rows apart from the contributors' by initiative
 * (`getTocByResultV2`: `result_toc_result` vs `contributors_result_toc_result`), so a `results_toc_result` binding of the
 * result's OWN answer must be scoped to this row's initiative, or it also returns the contributors' rows.
 */
const SUBMITTER_ROW_STEP: PathStep = {
  table: 'results_by_inititiative',
  join: [{ from: 'id', to: 'result_id' }],
  filter: { initiative_role_id: 1, is_active: 1 },
};

/** `results_toc_result` rows of ONE result and ONE initiative: joins on both pairs (result AND initiative). */
const tocRowsOfInitiative = (
  filter: PathStep['filter'] = { is_active: 1 },
): PathStep => ({
  table: 'results_toc_result',
  join: [
    { from: 'result_id', to: 'results_id' },
    { from: 'inititiative_id', to: 'initiative_id' },
  ],
  filter,
});

/**
 * Subfields of one partner chosen in a normal selector (NS.html:53-304): the partner, its CLARISA type and its role(s). Shared by
 * `partners.external_partners` (role 2) and, since QAC-T-22, `partners.kp_additional_partners` (role 8): the KP picker renders the same
 * chips (NS.html:105-179 for the roles, `[isComplete]="!!option?.delivery?.length"`).
 */
export const PARTNER_SUBFIELDS: CatalogSubField[] = [
  {
    key: 'institution',
    label: 'Partner',
    type: 'single_select',
    control_list: 'institutions',
    // identity of the element: a partner row always has its institution
    required: true,
    storage: {
      kind: 'column',
      table: 'results_by_institution',
      column: 'institutions_id',
    },
  },
  {
    // read-only "Institution type: <name>" of the chosen partner (NS.html:111): CLARISA `institution_type_code` of the institution
    key: 'partner_type',
    label: 'Partner type',
    type: 'single_select',
    control_list: 'institution_types',
    storage: {
      kind: 'lookup',
      source: 'clarisa.institutions',
      keys: [{ from: 'institution', to: 'id' }],
      value_column: 'institution_type_code',
    },
  },
  {
    // toggles Scaling / Demand / Innovation / Other per partner (NS.html:113-179), stored one row per role. QAC-T-19, form-only:
    // each chosen partner must have at least one role (mandatory marker `[isComplete]="!!option?.delivery?.length"`, NS.html:105-108,
    // :219-221); the function's delivery check is commented out (V-CP:134-139).
    key: 'partner_role',
    label: 'Partner role',
    type: 'multi_select',
    control_list: 'partner_delivery_types',
    required: true,
    storage: {
      kind: 'path',
      steps: [
        {
          table: 'result_by_institutions_by_deliveries_type',
          join: [{ from: 'id', to: 'result_by_institution_id' }],
          filter: { is_active: 1 },
        },
      ],
      value_column: 'partner_delivery_type_id',
    },
  },
];

/**
 * QAC-T-22: `results_center.from_cgspace`, the stored flag that locks a center the CGSpace sync brought into a knowledge product:
 * its chip carries the tooltip "To remove this center, please contact your librarian" and no remove icon (CP.html:158,162; CP.ts:130
 * `disabledText`) and its option is disabled in the dropdown (CP.html:113,138; rd-contributors-and-partners.service.ts:686
 * `getDisabledCentersForKP`). The form has NO label for the flag (only that tooltip, which is help text and so not a subfield description),
 * so the label is a plain "From CGSpace". Only a knowledge product has the flag set. A select carries extra data as subfields (QAC-R-1).
 */
const FROM_CGSPACE_SUBFIELD: CatalogSubField = {
  key: 'from_cgspace',
  label: 'From CGSpace',
  type: 'boolean',
  visible_when: whenEq(RESULT_TYPE_FIELD, 'knowledge_product'),
  storage: { kind: 'column', table: 'results_center', column: 'from_cgspace' },
};

/** QAC-T-25: identity of a center element (the same `results_center.center_id` the list is keyed on); a center row always has its center. */
const CENTER_SUBFIELD: CatalogSubField = {
  key: 'center',
  label: 'Center',
  type: 'single_select',
  control_list: 'centers',
  required: true,
  storage: { kind: 'column', table: 'results_center', column: 'center_id' },
};

/** A column of the M-QAP match row (`results_kp_mqap_institutions`) of a `results_by_institution` element (QAC-T-22). */
const kpMqapColumn = (value_column: string): PathBinding => ({
  kind: 'path',
  steps: [
    {
      table: 'results_kp_mqap_institutions',
      filter: { is_active: 1 },
      join: [
        {
          from: 'result_kp_mqap_institution_id',
          to: 'result_kp_mqap_institution_id',
        },
      ],
    },
  ],
  value_column,
});

/** A column of the submitter's `results_toc_result` row: one value per result (not one per ToC row of the portfolio). */
const submitterTocColumn = (value_column: string): StorageBinding => ({
  kind: 'path',
  steps: [SUBMITTER_ROW_STEP, tocRowsOfInitiative({ is_active: 1 })],
  value_column,
});

/** A ToC indicator is addressed by `related_node_id` or by numeric `id`, depending on the row (P2-2932): alternatives. */
const INDICATOR_KEYS = [
  { from: 'kpi', to: 'related_node_id' },
  { from: 'kpi', to: 'id' },
];

/**
 * One ToC mapping element ("Multiple WPs"): the SAME subfields describe a result's own mappings (`toc.entries`) and each
 * Science Program's mappings (`contributors.science_programs.toc_entries`, depth 2). Every binding starts from a
 * `results_toc_result` row (the parent element's row, DD-12), so both parents use the identical bindings.
 * Conditions name only sibling subfield keys (a depth-2 condition cannot name its parent's siblings).
 */
/** Every result type except impact contribution (result level 1, whose ToC level is not asked, MWC.html:3). */
const LEVEL_ASKED_TYPES = [
  'policy_change',
  'innovation_use',
  'other_outcome',
  'capacity_sharing',
  'knowledge_product',
  'innovation_development',
  'other_output',
  'innovation_package',
];

const tocMappingSubfields = (): CatalogSubField[] => [
  {
    key: 'level',
    label: 'Level',
    type: 'single_select',
    control_list: 'toc_levels',
    // QAC-T-19, form-only (V-CP has no rule for the level): MWC.html:3-17 `[required]="!isUnplanned"`; the select is hidden for an
    // impact-level result that is mapped (MWC.html:3 `resultLevelId === 1 ? !planned_result : true`), so it is asked for every
    // result type except impact_contribution. The elements exist only when the answer is Yes (see toc.entries / toc_entries).
    required_when: whenIn(RESULT_TYPE_FIELD, LEVEL_ASKED_TYPES),
    storage: {
      kind: 'column',
      table: 'results_toc_result',
      column: 'toc_level_id',
    },
  },
  {
    key: 'toc_result',
    label: 'Output/Outcome',
    type: 'single_select',
    control_list: 'toc_results',
    // shown once a level is chosen (MWC.html:20, `secondFieldLabel() && toc_level_id`); form MWC.html:28,43,59 `[required]="!isUnplanned"`; V-CP:52 `toc_result_id IS NOT NULL`
    visible_when: notNull('level'),
    required: true,
    storage: {
      kind: 'column',
      table: 'results_toc_result',
      column: 'toc_result_id',
    },
  },
  {
    key: 'hlo_statement',
    label: 'High Level Output Statement',
    type: 'text',
    // read-only statement of the selected ToC node, `outcome_statement ?? description` (MWC.ts:170-178; the server maps
    // `tr.result_description AS outcome_statement`, results-toc-results.repository.ts:553); MWC.html:75 shows it once a node is selected
    visible_when: notNull('toc_result'),
    storage: {
      kind: 'lookup',
      source: 'toc.integration_information.toc_results',
      // tr.id = rtr.toc_result_id (results-toc-results.repository.ts:331)
      keys: [{ from: 'toc_result', to: 'id' }],
      value_column: 'result_description',
    },
  },
  {
    key: 'kpi',
    label: 'KPI Statement/description',
    type: 'single_select',
    control_list: 'toc_results_indicators',
    // MWC.html:85-101: the KPI select appears once a node with indicators is selected (pr-select default required, no `[required]`); V-CP:54,62-64 requires >= 1 active, applicable indicator per mapping
    visible_when: notNull('toc_result'),
    required: true,
    storage: {
      kind: 'path',
      steps: [
        {
          table: 'results_toc_result_indicators',
          join: [
            { from: 'result_toc_result_id', to: 'results_toc_results_id' },
          ],
          filter: { is_active: 1, is_not_aplicable: 0 },
        },
      ],
      value_column: 'toc_results_indicator_id',
    },
  },
  {
    key: 'indicator_typology',
    label: 'Indicator Typology',
    type: 'text',
    // read-only "Type" of the selected KPI: `type_name` (MWC.ts:182-202, P2-3204); MWC.html:106-115
    visible_when: notNull('kpi'),
    storage: {
      kind: 'lookup',
      source: 'toc.integration_information.toc_results_indicators',
      // `toc_results_indicator_id` holds the node's `related_node_id` for some rows and its numeric `id` for others
      // (P2-2932, results-toc-results.repository.ts:502-513): either key matches
      keys: INDICATOR_KEYS,
      value_column: 'type_name',
    },
  },
  {
    key: 'unit_of_measurement',
    label: 'Unit of measurement',
    type: 'text',
    // `unit_messurament` is the ToC column's real (misspelled) name, toc-results.repository.ts:1029; MWC.html:118-122
    visible_when: notNull('kpi'),
    storage: {
      kind: 'lookup',
      source: 'toc.integration_information.toc_results_indicators',
      keys: INDICATOR_KEYS,
      value_column: 'unit_messurament',
    },
  },
  {
    key: 'target',
    label: 'Target',
    type: 'number',
    // ToC target of the KPI for the result's reporting year (toc_result_indicator_target joined on related_node_id and
    // target_date, toc-results.repository.ts:1033-1037); MWC.html:118-122 `targets[0].target_value`
    visible_when: notNull('kpi'),
    storage: {
      kind: 'lookup',
      source: 'toc.integration_information.toc_result_indicator_target',
      // matched on the indicator (either key, as above: `toc_result_indicator_id` = related_node_id, `id_indicator` = id) AND
      // on the reporting year (`target_date` = the result's phase year), toc-results.repository.ts:1033-1038
      keys: [
        { from: 'kpi', to: 'toc_result_indicator_id' },
        { from: 'kpi', to: 'id_indicator' },
      ],
      // `target_date` is stored as `YYYY` and as `YYYY-MM-DD`: compare its year part (`getIndicatorTargetCatalog`,
      // results-toc-results.repository.ts:2670-2676, 3465-3466); several rows can remain, the repository takes the
      // first by `ORDER BY target_date DESC` (:2629-2645)
      qualifiers: [
        { column: 'target_date', equals: PHASE_YEAR, match: 'year' },
      ],
      pick: { order_by: 'target_date', direction: 'desc' },
      value_column: 'target_value',
    },
  },
  {
    key: 'contribution_to_target',
    label: 'Contribution to indicator target',
    type: 'number',
    // MWC.html:125-172: shown once a KPI is chosen, mandatory in 2026 (`[required]="isCP2026()"`); V-CP:57,65-67 requires a value > 0 (inventory §9 Q10)
    visible_when: notNull('kpi'),
    required: true,
    storage: {
      kind: 'path',
      steps: [
        {
          table: 'results_toc_result_indicators',
          join: [
            { from: 'result_toc_result_id', to: 'results_toc_results_id' },
          ],
          filter: { is_active: 1, is_not_aplicable: 0 },
        },
        {
          table: 'result_indicators_targets',
          join: [
            {
              from: 'result_toc_result_indicator_id',
              to: 'result_toc_result_indicator_id',
            },
          ],
          filter: { is_active: 1 },
        },
      ],
      value_column: 'contributing_indicator',
    },
  },
];

/** Types whose form requires the linked/bundled answer: every type except innovation use (optional on its own page) and innovation package. */
const LINK_REQUIRED_TYPES = [
  'policy_change',
  'other_outcome',
  'capacity_sharing',
  'knowledge_product',
  'innovation_development',
  'other_output',
  'impact_contribution',
];

export const CONTRIBUTORS_PARTNERS_FIELDS: CatalogField[] = [
  {
    key: 'contributors.submitter',
    label: 'Submitter',
    type: 'single_select',
    control_list: 'initiatives',
    section: SECTION,
    order: 1,
    // QAC-T-27: not on the IPSR 2026 contributors page, which starts at the ToC question (ipsr-contributors.component.html:6-16).
    result_types: NON_IPSR_TYPES,
    // QAC-T-19, form-only: no live rule (V-CP never reads it); pr-select default required (CP.html:9-25, no `[required]`, shown in every
    // phase; the select is only disabled when the result has a single program)
    required: true,
    required_confirmed: false,
    ...FROM_2026,
    storage: {
      kind: 'relation',
      table: 'results_by_inititiative',
      fk_to_result: 'result_id',
      value_column: 'inititiative_id',
      filter: { initiative_role_id: 1, is_active: 1 },
    },
  },
  {
    key: 'toc.planned_result',
    label: 'Can this result be mapped to a ToC KPI?',
    description:
      "If Yes, please select the relevant level, KPI, and indicate the result contribution to the target. If No, please provide a short justification explaining why this result is being reported outside the 2026 ToC KPI. No-mapped results will be shared with the Program team for consideration as part of the adaptive management process, and may feed into updates to the Program's 2027 ToC.",
    type: 'boolean',
    section: SECTION,
    order: 2,
    result_types: ALL_TYPES,
    // CP.html:38-46 (always shown). FUNCTION-STATED in 2026: the form marks it required only before 2026 (`[required]="!isAvisaInitiative() && !isCP2026()"`,
    // CP.html:41), but V-CP:11-27 a NULL answer falls into the "mapped" branch, so the function effectively requires it. Kept (never weakened).
    required: true,
    required_confirmed: true,
    ...FROM_2026,
    // the submitter's answer: one value (see SUBMITTER_ROW_STEP)
    storage: submitterTocColumn('planned_result'),
  },
  {
    // "Multiple WPs": one element per ToC mapping (tab "HLO N~i", MWP.html:9-25). CP.html:67-81 renders the component; MWP.html:4
    // (`isCP2026() ? !isUnplanned : true`) hides it when the answer is No.
    key: 'toc.entries',
    label: 'ToC contributions',
    type: 'list',
    section: SECTION,
    order: 3,
    result_types: ALL_TYPES,
    required: false,
    required_confirmed: true,
    visible_when: whenEq('toc.planned_result', true),
    required_when: whenEq('toc.planned_result', true),
    ...FROM_2026,
    // the submitter's own mappings only: the contributors' rows are `contributors.science_programs.toc_entries`
    storage: {
      kind: 'path',
      steps: [SUBMITTER_ROW_STEP, tocRowsOfInitiative()],
      value_column: 'result_toc_result_id',
    },
    subfields: tocMappingSubfields(),
  },
  {
    key: 'toc.program_invested_financial_resources',
    label:
      'Did the Program invest financial resources in the achievement of this result?',
    description:
      "Select 'Yes' if direct program funds were utilized to achieve this result. Select 'No' if the result was achieved organically (e.g., policy influence) without financial investment from the program.",
    type: 'boolean',
    section: SECTION,
    order: 4,
    result_types: ALL_TYPES,
    // CP.html:51-65 (`isCP2026() && !planned_result`, `[required]="true"`). No live rule (client-only): V-CP never reads the column.
    required: false,
    required_confirmed: false,
    visible_when: whenEq('toc.planned_result', false),
    required_when: whenEq('toc.planned_result', false),
    ...FROM_2026,
    storage: submitterTocColumn('program_invested_financial_resources'),
  },
  {
    key: 'toc.narrative',
    label: 'Why is the result being reported?',
    type: 'text',
    section: SECTION,
    order: 5,
    result_types: ALL_TYPES,
    // CP.html:83-94 (`!planned_result && !hideWhyReportedField()`, see the header for the initiative 41 exemption); V-CP:30-32 `valid_text`
    required: false,
    required_confirmed: true,
    visible_when: whenEq('toc.planned_result', false),
    required_when: whenEq('toc.planned_result', false),
    ...FROM_2026,
    storage: submitterTocColumn('toc_progressive_narrative'),
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
    // QAC-T-19, form-only: CP.html:250-267 (always shown, `[required]="true"` at :255); the live function has the lead-center check commented out
    // (V-CP:121-132,176). Placed BEFORE the contributing centers by the owner (2026-10-07).
    required: true,
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
    // Narrowed to the centers that came FROM the ToC (owner authorization 2026-10-07, pre-release: the key and its
    // meaning "contributing centers" stay, the stored set gets `from_toc = 1`; the "Other(s)" centers are `contributors.other_centers`).
    key: 'contributors.centers',
    label: 'Contributing CGIAR Centers',
    description:
      "The CGIAR Centers listed below were identified in your 2026 ToC. To select a different Center, choose 'Other' from the drop-down menu and then make your selection from the options that appear.",
    // QAC-T-25: a `list` (one element per center, identity subfield `center`): the contract defines subfields on `list` only.
    type: 'list',
    section: SECTION,
    order: 7,
    // QAC-T-27 (owner decision): the IPSR form has a single centers list, `contributors.ipsr_centers`.
    result_types: NON_IPSR_TYPES,
    // CP.html:98-116 (dropdown 1, `[required]="true"`; at least one center must stay from the ToC when the ToC brings centers, CP.ts:549-551).
    // No live rule: the function has the center check commented out (V-CP:124-132). Always shown: when the answer is No the client
    // paints a flat dropdown with the same label (CP.html:128-141, `[required]="true"` at :135).
    // QAC-T-19, form-only: `required: true`. Documented gap: when the ToC returned NO centers the form moves the requirement to
    // `contributors.other_centers` (CP.html:192, CP.ts:549-559 `requiresTocCenter` / `contributingCentersComplete`), which is ToC
    // reference data and cannot be a catalog condition.
    required: true,
    required_confirmed: false,
    ...FROM_2026,
    storage: {
      kind: 'relation',
      table: 'results_center',
      fk_to_result: 'result_id',
      value_column: 'center_id',
      filter: { is_active: 1, from_toc: 1 },
    },
    subfields: [CENTER_SUBFIELD, FROM_CGSPACE_SUBFIELD],
  },
  {
    key: 'contributors.other_centers',
    label: 'Other(s) Contributing CGIAR Centers',
    // QAC-T-25: a `list` (one element per center, identity subfield `center`): the contract defines subfields on `list` only.
    type: 'list',
    section: SECTION,
    order: 8,
    // QAC-T-27 (owner decision): the IPSR form has no "Other(s)" centers dropdown (see `contributors.ipsr_centers`).
    result_types: NON_IPSR_TYPES,
    // CP.html:179-209 (`[required]="!hasReferenceCenters()"`: required only when the ToC brought no centers, which is ToC reference
    // data, not a catalog key). No live rule (V-CP:124-132). Visibility is UI state, see the header.
    // QAC-T-19: stays `required: false`: the form requires it only in that ToC-reference case (documented gap, see contributors.centers).
    required: false,
    required_confirmed: false,
    ...FROM_2026,
    storage: {
      kind: 'relation',
      table: 'results_center',
      fk_to_result: 'result_id',
      value_column: 'center_id',
      filter: { is_active: 1, from_toc: 0 },
    },
    subfields: [CENTER_SUBFIELD, FROM_CGSPACE_SUBFIELD],
  },
  {
    // QAC-T-27 (owner decision, 2026-10-09): the IPSR (`innovation_package`) 2026 form has ONE centers list, "Contributing CGIAR Centers"
    // (ipsr-contributors.component.html:74-85, `rdPartnersSE.partnersBody.contributing_center`), with no ToC-derived / "Other(s)" split.
    // IPSR sends the centers without `from_toc` (ipsr-contributors.component.ts:627 `contributing_center`) and the server stores
    // `!!from_toc` (results_by_institutions.service.ts:772,777), so the binding carries NO `from_toc` filter: it is every active
    // `results_center` row of the result (the lead center is one of them, as `contributors.lead_center` is, QAC-T-19).
    // Form-only: the pr-multi-select defaults to `required = true` and the block does not opt out (ipsr-contributors.component.html:74-85,
    // pr-multi-select.component.ts:45); the V-CP center check is commented out (tmp/validation_contributor_partner_P25, V-CP:124-132),
    // so `required_confirmed` is false.
    key: 'contributors.ipsr_centers',
    label: 'Contributing CGIAR Centers',
    description:
      'CG Center that you collaborated with or are currently collaborating with to generate this result.',
    type: 'list',
    section: SECTION,
    order: 9,
    result_types: ['innovation_package'],
    required: true,
    required_confirmed: false,
    ...FROM_2026,
    storage: {
      kind: 'relation',
      table: 'results_center',
      fk_to_result: 'result_id',
      value_column: 'center_id',
      filter: { is_active: 1 },
    },
    subfields: [CENTER_SUBFIELD],
  },
  {
    // Contributing Science Program/Accelerator (CP.html:435-508, 2026). Each element is a program that contributes (accepted rows,
    // `initiative_role_id = 2`; pending requests live in share_result_request and are not result data) with ITS OWN ToC answer and
    // mappings, which the client shows read-only under "Other contributors" (CP.html:510-551).
    // The ToC rows of a program are the `results_toc_result` rows of THIS result whose `initiative_id` equals the program id: the
    // paths below join on both pairs (`result_id -> results_id` and `inititiative_id -> initiative_id`).
    key: 'contributors.science_programs',
    label: 'Contributing Science Program/Accelerator',
    description:
      "The Science Programs listed below were identified in your 2026 ToC. To select a different Science Program, choose 'Other' from the drop-down menu and then make your selection from the options that appear.",
    type: 'list',
    section: SECTION,
    order: 10,
    result_types: ALL_TYPES,
    // optional (`[required]="false"`, CP.html:452,495); no live rule
    required: false,
    required_confirmed: false,
    ...FROM_2026,
    storage: {
      kind: 'relation',
      table: 'results_by_inititiative',
      fk_to_result: 'result_id',
      value_column: 'inititiative_id',
      filter: { initiative_role_id: 2, is_active: 1 },
    },
    subfields: [
      {
        key: 'program',
        label: 'Contributing Science Program/Accelerator',
        type: 'single_select',
        control_list: 'initiatives',
        // identity of the element: a Science Program row always has its program
        required: true,
        storage: {
          kind: 'column',
          table: 'results_by_inititiative',
          column: 'inititiative_id',
        },
      },
      {
        // "from ToC" (dropdown 1) vs "Other(s) Science Program(s)" (dropdown 2): the stored flag, CP.ts:1166-1174
        key: 'from_toc',
        label: 'Identified in the ToC',
        type: 'boolean',
        storage: {
          kind: 'column',
          table: 'results_by_inititiative',
          column: 'from_toc',
        },
      },
      {
        // the program's own answer, shown read-only per contributor (CP.html:514-522, label "<code> <short_name> - Can this result be mapped to a ToC KPI?")
        key: 'planned_result',
        label: 'Can this result be mapped to a ToC KPI?',
        type: 'boolean',
        storage: {
          kind: 'path',
          steps: [tocRowsOfInitiative()],
          value_column: 'planned_result',
        },
      },
      {
        // the program's ToC mappings, shown once it answered (CP.html:534 `planned_result !== null`, MWP.html:4 hides them on No)
        key: 'toc_entries',
        label: 'ToC contributions',
        type: 'list',
        visible_when: whenEq('planned_result', true),
        storage: {
          kind: 'path',
          steps: [tocRowsOfInitiative()],
          value_column: 'result_toc_result_id',
        },
        subfields: tocMappingSubfields(),
      },
    ],
  },
  {
    key: 'contributors.bilateral_projects',
    label: 'Contributing W3 and/or bilateral projects',
    type: 'multi_select',
    control_list: 'projects',
    section: SECTION,
    order: 11,
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
    order: 12,
    result_types: ALL_TYPES,
    // NS.html:6-39 (card "External partners" with the "Not applicable" switch, always shown); V-CP:95,167 (NULL fails, TRUE short-circuits)
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
    // The partner picker (NS.html:53-304) is shown unless the switch is ON (`no_applicable_partner !== true`, NS.html:53; the owner's rule
    // is `= false`, so a never-answered NULL reads as not yet visible here). Pre-release type change multi_select -> list authorized by the
    // owner (2026-10-07): each element is a partner with its type and its role(s). The stored set stays role 2 rows of results_by_institution.
    key: 'partners.external_partners',
    label: 'External partners',
    description:
      'Partner information is inherited/sourced from the HLO/Outcome level in the ToC. Please review this list before saving — remove any partner that does not apply to this specific result, or add the ones that do.',
    type: 'list',
    section: SECTION,
    order: 13,
    result_types: NON_KP_TYPES,
    // V-CP:104-112,169: not applicable = false => at least one role 2 row
    required: false,
    required_confirmed: true,
    visible_when: whenEq('partners.not_applicable', false),
    required_when: whenEq('partners.not_applicable', false),
    ...FROM_2026,
    storage: {
      kind: 'relation',
      table: 'results_by_institution',
      fk_to_result: 'result_id',
      value_column: 'institutions_id',
      filter: { institution_roles_id: 2, is_active: 1 },
    },
    subfields: PARTNER_SUBFIELDS,
  },
  {
    // CP.html:563-570 (always shown, `[required]="true"`, read-only while "Not applicable" is on EXCEPT for a knowledge product, :569);
    // V-CP:168 NULL fails when not applicable = false (V-CP:167 TRUE short-circuits). QAC-T-19: form UNION function = required when not
    // applicable is false, or always for a knowledge product (its control stays editable); confirmed because V-CP states the first branch.
    // QAC-T-27: the IPSR markup equals W1/W2 (ipsr-contributors.component.html:288-294: `[required]="true"`, read-only while "Not applicable" is
    // on and the type is not a KP, :293), so the package needs no branch of its own: the field is `*` and has one rule.
    key: 'partners.is_lead_by_partner',
    label: 'Is this result being led by an external partner?',
    type: 'boolean',
    section: SECTION,
    order: 14,
    result_types: ALL_TYPES,
    required: false,
    required_confirmed: true,
    required_when: {
      any: [
        whenEq('partners.not_applicable', false),
        whenEq(RESULT_TYPE_FIELD, 'knowledge_product'),
      ],
    },
    ...FROM_2026,
    storage: {
      kind: 'column',
      table: 'result',
      column: 'is_lead_by_partner',
    },
  },
  {
    // CP.html:572-584 (`*ngIf is_lead_by_partner`, `[required]` = the answer); V-CP:116-122,177 exactly one leading row when the answer is Yes
    key: 'partners.lead_partner',
    label: 'Lead partner',
    description:
      'Please select the partner leading this result. Only partners already added in this section can be selected as the result lead.',
    type: 'single_select',
    control_list: 'institutions',
    section: SECTION,
    order: 15,
    result_types: ALL_TYPES,
    required: false,
    required_confirmed: true,
    visible_when: whenEq('partners.is_lead_by_partner', true),
    required_when: whenEq('partners.is_lead_by_partner', true),
    ...FROM_2026,
    storage: {
      kind: 'relation',
      table: 'results_by_institution',
      fk_to_result: 'result_id',
      value_column: 'is_leading_result',
    },
  },
  // Linked-result question (former `linked_results` section, QAC-T-8 · inventory C-6). On the client it lives
  // inside this page, after the partners block: CP.html:586-634 (question) and :634+ (result picker). Innovation use
  // (2026+) renders the SAME stored answer on its own page (innovation-use-info.component.html:20,33-44, picker label
  // "Please select an Innovation Development result") and hides it here (CP.ts:439-446 `showsQaInnovationLink`); it keeps
  // this single key (no new keys).
  {
    key: 'linked.has_innovation_link',
    label:
      'Is this result linked or bundled with another CGIAR-reported result (such as innovation, KP, policy, etc.)?',
    type: 'boolean',
    section: SECTION,
    order: 16,
    // QAC-T-27: the IPSR 2026 form drops the link tab (ipsr-contributors.component.ts:667-672 deletes both keys from the PATCH).
    result_types: NON_IPSR_TYPES,
    // QAC-T-19, form-only: V-CP:135-152 never requires the ANSWER (only the linked rows when it is Yes), so `required_confirmed` is false
    // (was true). The form requires the answer for innovation development (fieldRef config `required: true`, fields-manager.service.ts
    // `[innovation-use-form]-has-innovation-link`; CP.html:606-616) and, from 2026, for every other type (generic radio
    // `[required]="true"`, CP.html:620-623). It is optional for innovation use, where the question lives on the Innovation Use page
    // (`[required]="false"`, innovation-use-info.component.html:22) and is hidden here (CP.ts:439-445 `showsQaInnovationLink`).
    // Required for every type except innovation use AND innovation package (the package has no such question).
    required: false,
    required_confirmed: false,
    required_when: whenIn(RESULT_TYPE_FIELD, LINK_REQUIRED_TYPES),
    ...FROM_2026,
    storage: { kind: 'column', table: 'result', column: 'has_innovation_link' },
  },
  {
    // CP.html:634-751 (`has_innovation_link && isP25()`), mandatory marker CP.html:751 (header `[required]="true"` :636); V-CP:150-166 at least one active
    // linked row when the answer is Yes. For innovation use the form makes it optional (innovation-use-info.component.html:34-45 `[required]="false"`)
    // but V-CP:143-166 still requires it: that part is FUNCTION-STATED and kept.
    key: 'linked.results',
    label: 'Please select a result:',
    type: 'multi_select',
    control_list: 'results',
    section: SECTION,
    order: 17,
    // QAC-T-27: the IPSR 2026 form drops the link tab (ipsr-contributors.component.ts:667-672).
    result_types: NON_IPSR_TYPES,
    required: false,
    required_confirmed: true,
    visible_when: whenEq('linked.has_innovation_link', true),
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
  {
    // KP only ("Additional partners"). Kept as it was, with its rule (owner 2026-10-07); only the display rule is added: the picker
    // container is hidden while "Not applicable" is on (NS.html:53). V-CP:98-112 role 8 rows for a KP, V-CP:169
    // QAC-T-22 (Leader decision, pre-release, same authorization as the owner's 2026-10-07 `partners.external_partners` change): type
    // multi_select -> list, key unchanged. The KP picker shows each chosen partner with its institution type and its roles and marks the
    // roles mandatory (NS.html:105-179); V-CP does not check the roles.
    key: 'partners.kp_additional_partners',
    label: 'Partners',
    type: 'list',
    section: SECTION,
    order: 18,
    result_types: ['knowledge_product'],
    required: false,
    required_confirmed: true,
    visible_when: whenEq('partners.not_applicable', false),
    required_when: whenEq('partners.not_applicable', false),
    ...FROM_2026,
    storage: {
      kind: 'relation',
      table: 'results_by_institution',
      fk_to_result: 'result_id',
      value_column: 'institutions_id',
      filter: { institution_roles_id: 8, is_active: 1 },
    },
    subfields: PARTNER_SUBFIELDS,
  },
  {
    // QAC-T-22. KP only: the "Author affiliations" block (KPS.html:14-123, rendered by CP.html:559 when `isKnowledgeProduct`; the heading
    // and its sub-title are KPS.html:15-16). One element per author affiliation M-QAP matched at CGSpace: the ACTIVE role 2 rows of
    // `results_by_institution` that carry a `result_kp_mqap_institution_id` (server list: results_by_institutions.service.ts:155-180
    // `mqap_institutions`, which also needs `is_predicted` not null). The "carries an M-QAP id" part is not an equality filter, so the
    // field BINDS that id as its element value (it is the key of every subfield path below) and the filter keeps the role/active part;
    // a row whose `value_column` is NULL is not an element (types.ts `RelationBinding`), so the other role 2 rows of a KP (none are
    // written for a KP, V-CP:98-103 counts role 8) have a NULL id and are no element. The server's extra `is_predicted IS NOT NULL` clause
    // is equivalent today: every writer sets it (results-knowledge-products.mapper.ts:665, results_by_institutions.service.ts:1015-1020,
    // results-knowledge-products.service.ts:1562) and the column is NOT NULL.
    // Not hidden by "Not applicable" (the block sits outside the switch, CP.html:559 vs NS.html:53). `[required]="false"` on the select
    // (KPS.html:51) and the function does not check the block (V-CP counts role 8 for a KP, role 2 otherwise): optional, unconfirmed.
    key: 'partners.kp_author_affiliations',
    label: 'Author affiliations',
    description: 'Please match each author affiliation with a CLARISA partner.',
    type: 'list',
    section: SECTION,
    order: 19,
    result_types: ['knowledge_product'],
    required: false,
    required_confirmed: false,
    ...FROM_2026,
    storage: {
      kind: 'relation',
      table: 'results_by_institution',
      fk_to_result: 'result_id',
      value_column: 'result_kp_mqap_institution_id',
      filter: { institution_roles_id: 2, is_active: 1 },
    },
    subfields: [
      {
        // KPS.html:24-27 "CGSpace author affiliation: <name>", the affiliation string CGSpace holds (read-only, never edited here)
        key: 'cgspace_affiliation',
        label: 'CGSpace author affiliation',
        type: 'text',
        storage: kpMqapColumn('intitution_name'),
      },
      {
        // KPS.html:36-45 badge "Predicted by M-QAP AI" (true) / "Manual match" (false). Recomputed on every save: true only when the chosen
        // partner equals M-QAP's predicted institution AND its confidence reaches the global threshold `kp_mqap_institutions_confidence`
        // (results_by_institutions.service.ts:1015-1020); a partner the reporter picks by hand is false. Stored, not derived at read time.
        key: 'is_predicted',
        label: 'Predicted by M-QAP AI',
        type: 'boolean',
        storage: {
          kind: 'column',
          table: 'results_by_institution',
          column: 'is_predicted',
        },
      },
      {
        // KPS.html:47-60 app-pr-select "CLARISA partner", `[required]="false"`. M-QAP prefills it only when its confidence reaches the
        // threshold (results-knowledge-products.mapper.ts:651-665); otherwise it starts empty (`institutions_id` NULL) for the reporter to pick.
        key: 'clarisa_partner',
        label: 'CLARISA partner',
        type: 'single_select',
        control_list: 'institutions',
        required: false,
        storage: {
          kind: 'column',
          table: 'results_by_institution',
          column: 'institutions_id',
        },
      },
      {
        // read-only "Institution type: <name>" of the chosen partner (KPS.html:63-69, 'No partner selected' when empty): CLARISA type of the partner
        key: 'partner_type',
        label: 'Institution type',
        type: 'single_select',
        control_list: 'institution_types',
        storage: {
          kind: 'lookup',
          source: 'clarisa.institutions',
          keys: [{ from: 'clarisa_partner', to: 'id' }],
          value_column: 'institution_type_code',
        },
      },
      {
        // The "confidence level for the predicted match is <n>%" sentence (KPS.ts generateDescription, shown in the select's description
        // KPS.html:54) exists only for a predicted match; a manual match shows the "couldn't find a matching partner" text instead.
        key: 'confidence',
        label: 'Confidence level of the predicted match (%)',
        type: 'number',
        visible_when: whenEq('is_predicted', true),
        storage: kpMqapColumn('confidant'),
      },
      {
        // KPS.html:86-104 "Partner role:" toggles Scaling / Demand / Innovation / Other, one stored row per role (same rows as
        // `partners.external_partners` > `partner_role`). Unlike the normal selector, the KP selector carries NO mandatory marker for the roles
        // (no `[isComplete]`, no `appFeedbackValidation` in KPS.html) and V-CP does not check them: optional.
        key: 'roles',
        label: 'Partner role',
        type: 'multi_select',
        control_list: 'partner_delivery_types',
        required: false,
        storage: {
          kind: 'path',
          steps: [
            {
              table: 'result_by_institutions_by_deliveries_type',
              join: [{ from: 'id', to: 'result_by_institution_id' }],
              filter: { is_active: 1 },
            },
          ],
          value_column: 'partner_delivery_type_id',
        },
      },
    ],
  },
];
