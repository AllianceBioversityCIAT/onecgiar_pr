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
// linked block, KP-only partners. Orders run 1..17.
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
//  - Subfields have no `required_confirmed` flag. A subfield `required: true` therefore means "the live function states it"
//    (cited V-CP lines). A rule only the client enforces (`client-only` in a comment) is NOT `required` (top-level convention:
//    client-only = `required: false`, `required_confirmed: false`). The one exception is the identity of an element
//    (the program of a Science Program row, the institution of a partner row): `required: true` because the element
//    cannot exist without it, i.e. it is always present, not because the client form asks for it.
// QAC-T-15 rework (catalog 2026.12): path steps join on column PAIRS (result AND initiative), so `toc.*` and the Science Program ToC
//    rows are scoped to one initiative; lookups declare their key columns (alternatives) and qualifiers (target year).
import {
  Condition,
  CatalogField,
  CatalogSection,
  CatalogSubField,
  PHASE_YEAR,
  PathStep,
  StorageBinding,
} from '../types';
import {
  ALL_TYPES,
  FROM_2026,
  NON_KP_TYPES,
  RESULT_TYPE_FIELD,
  whenEq,
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
const tocMappingSubfields = (): CatalogSubField[] => [
  {
    key: 'level',
    label: 'Level',
    type: 'single_select',
    control_list: 'toc_levels',
    // client-only requirement (MWC.html:4-17 `[required]="!isUnplanned"`): V-CP has no rule for the level (owner: validation_toc_P25
    // not needed), so it is not `required` here (a subfield `required` means the live function states it)
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
    // shown once a level is chosen (MWC.html:20, `secondFieldLabel() && toc_level_id`); V-CP:52 `toc_result_id IS NOT NULL`
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
    // MWC.html:85-101: the KPI select appears once a node with indicators is selected; V-CP:54,62-64 requires >= 1 active, applicable indicator per mapping
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

export const CONTRIBUTORS_PARTNERS_FIELDS: CatalogField[] = [
  {
    key: 'contributors.submitter',
    label: 'Submitter',
    type: 'single_select',
    control_list: 'initiatives',
    section: SECTION,
    order: 1,
    result_types: ALL_TYPES,
    // no live rule (owner: function not needed); the client requires it by default (CP.html:9-25, shown in every phase)
    required: false,
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
    // CP.html:38-46 (always shown). V-CP:11-27: a NULL answer falls into the "mapped" branch, so the function effectively requires it
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
    // CP.html:250-267 (always shown, `[required]="true"`); the live function has the lead-center check commented out (V-CP:121-132,176).
    // Placed BEFORE the contributing centers by the owner (2026-10-07).
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
    // Narrowed to the centers that came FROM the ToC (owner authorization 2026-10-07, pre-release: the key and its
    // meaning "contributing centers" stay, the stored set gets `from_toc = 1`; the "Other(s)" centers are `contributors.other_centers`).
    key: 'contributors.centers',
    label: 'Contributing CGIAR Centers',
    description:
      "The CGIAR Centers listed below were identified in your 2026 ToC. To select a different Center, choose 'Other' from the drop-down menu and then make your selection from the options that appear.",
    type: 'multi_select',
    control_list: 'centers',
    section: SECTION,
    order: 7,
    result_types: ALL_TYPES,
    // CP.html:98-116 (dropdown 1, `[required]="true"`; at least one center must stay from the ToC when the ToC brings centers, CP.ts:549-551).
    // No live rule: the function has the center check commented out (V-CP:124-132). Always shown: when the answer is No the client
    // paints a flat dropdown with the same label (CP.html:128-141).
    required: false,
    required_confirmed: false,
    ...FROM_2026,
    storage: {
      kind: 'relation',
      table: 'results_center',
      fk_to_result: 'result_id',
      value_column: 'center_id',
      filter: { is_active: 1, from_toc: 1 },
    },
  },
  {
    key: 'contributors.other_centers',
    label: 'Other(s) Contributing CGIAR Centers',
    type: 'multi_select',
    control_list: 'centers',
    section: SECTION,
    order: 8,
    result_types: ALL_TYPES,
    // CP.html:179-209 (`[required]="!hasReferenceCenters()"`: required only when the ToC brought no centers, which is ToC reference
    // data, not a catalog key). No live rule (V-CP:124-132). Visibility is UI state, see the header.
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
    order: 9,
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
    order: 10,
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
    order: 11,
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
    order: 12,
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
    subfields: [
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
        // toggles Scaling / Demand / Innovation / Other per partner (NS.html:113-179), stored one row per role. Client-only requirement
        // (`[isComplete]="!!option?.delivery?.length"`, NS.html:105-108): the function's delivery check is commented out (V-CP:134-139),
        // so it is not `required` here.
        key: 'partner_role',
        label: 'Partner role',
        type: 'multi_select',
        control_list: 'partner_delivery_types',
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
  {
    // CP.html:563-570 (always shown, read-only while "Not applicable" is on, `[required]="true"`); V-CP:168 NULL fails when not applicable = false
    key: 'partners.is_lead_by_partner',
    label: 'Is this result being led by an external partner?',
    type: 'boolean',
    section: SECTION,
    order: 13,
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
    // CP.html:572-584 (`*ngIf is_lead_by_partner`, `[required]` = the answer); V-CP:116-122,177 exactly one leading row when the answer is Yes
    key: 'partners.lead_partner',
    label: 'Lead partner',
    description:
      'Please select the partner leading this result. Only partners already added in this section can be selected as the result lead.',
    type: 'single_select',
    control_list: 'institutions',
    section: SECTION,
    order: 14,
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
    order: 15,
    result_types: ALL_TYPES,
    // Live rule only for innovation_development; other types have no live rule (client-only required, CP.html:620-631).
    required: false,
    required_confirmed: true,
    required_when: whenEq(RESULT_TYPE_FIELD, 'innovation_development'),
    ...FROM_2026,
    storage: { kind: 'column', table: 'result', column: 'has_innovation_link' },
  },
  {
    // CP.html:634-751 (`has_innovation_link && isP25()`), mandatory marker CP.html:751; V-CP:150-166 at least one active linked row when the answer is Yes
    key: 'linked.results',
    label: 'Please select a result:',
    type: 'multi_select',
    control_list: 'results',
    section: SECTION,
    order: 16,
    result_types: ALL_TYPES,
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
    key: 'partners.kp_additional_partners',
    label: 'Partners',
    type: 'multi_select',
    control_list: 'institutions',
    section: SECTION,
    order: 17,
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
  },
];
