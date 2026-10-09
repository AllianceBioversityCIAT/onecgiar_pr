// @akili-spec quality-assurance/qa-field-catalog
// QAC-T-11 · inventory 2026-B §3.5 (step 2.1) and §3.6 (step 2.2). Keys frozen as written there.
// QAC-T-29 (catalog 2026.28): the child-complementary-result sub-fields (2.1 modal) and the 2.2 enabler types are bound; both
// fields are `list`s of the package's complementary elements. Option B (QAC-T-19): `required` = what the form requires UNION what
// VS21 / VS22 state; `required_confirmed` true only where the function states it; `visible_when` from the form.
//
// Citation legend (client paths under onecgiar-pr-client/src/app/pages/ipsr/pages/innovation-package-detail/pages/ipsr-innovation-use-pathway/pages/step-n2/):
//   S21  = pages/complementary-innovation/complementary-innovation.component.html
//   S21M = pages/complementary-innovation/components/new-complementary-innovation/new-complementary-innovation.component.html
//   S22  = pages/step-two-basic-info/step-two-basic-info.component.html (S22.ts = .ts)
//   S2   = step-n2.component.html
//   VS21 / VS22 = tmp/validation_ipsr_step_two_one_P25 / validation_ipsr_step_two_two_P25 (byte-identical bodies)
//   W2   = onecgiar-pr-server/src/api/ipsr/innovation-pathway/innovation-pathway-step-two.service.ts
//
// Decisions (owner mandate 2026-10-06, no model change; QAC-T-29 changes marked):
//  - `ipsr_step_2_1.complementary_innovations` (required, confirmed: VS21:7-27 needs >= 1 active role-2 element). QAC-T-29: it is now a
//    `list` (PRE-RELEASE type change `multi_select` -> `list`, as the inventory planned) whose element is a `result_by_innovation_package`
//    row (ipsr_role_id 2, active; W2 savePrevious :153-228 writes exactly those rows). The first subfield `result` is the identity
//    (the element's result id, control list `ipsr_bundle_candidates`).
//  - The modal "Add new complementary innovation/ enabler/ solution" (S21M) creates a CHILD result of type 11 (W2 saveComplementaryInnovation
//    :246-394): `result` (title = "Long title", description), `result_by_innovation_package` (role 2: the element), and one
//    `results_complementary_innovation` row (short title, other functions, projects question) plus one
//    `results_complementary_innovations_function` row per ticked function. So title/description are the child RESULT's own columns
//    (reached through `result_id -> id`; the same columns the common `general.title` / `general.description` describe for that result,
//    here exposed under the inventory's planned keys) and the rest hangs off `results_complementary_innovation.result_id = element.result_id`.
//  - Elements picked from the table (S21:14-25) are other PRMS results (the table lists types [1, 2, 5, 7], legacy phases [7]: complementary-innovation.component.ts:66-67,393): they have no `results_complementary_innovation` row and
//    the modal fields do not exist for them. The subfield `result_type` (element result's `result_type_id`) discriminates, and every modal
//    subfield carries `visible_when` / `required_when` = `result_type eq 11` so a reviewer never asks a table-picked element for a short title.
//  - Modal rules (S21M `[required]` markers and the server guard W2:284-327): short title (:33-38, max 10 words), long title (:48-54, max 30
//    words) and the aware-of-projects question (:110-119, W2:329-339 rejects null) are required. "Function" is marked `[required]="true"`
//    (:73-76) but the real rule is "at least one function OR other functions" (disableSaveButton, complementary-innovation/CLAUDE.md): an
//    any-of that `required_when` cannot say, so `functions` and `other_functions` stay optional here (documented gap, same treatment as the
//    step-1 targeted-use lists). The "specify" text shows only while the answer is Yes (:123-129, W2:349-351 stores NULL otherwise) and is
//    optional (the textarea has no `[required]`). Description is optional (:57-71). VS21 states none of these (no `required_confirmed` on subfields).
//  - Step 2.2 (`ipsr_step_2_2.enabler_elements`, S22): ADMIN-ONLY tab (S2:12 `*ngIf rolesSE.isAdmin`; alert S22:3-6). Visibility by role
//    cannot be a data condition: documented here and in docs/qa-catalog.en.md, every row is stored regardless. The list has the same elements
//    as 2.1 (one collapsible item per role-2 element, S22:8-12). VS22 states only "at least one role-2 element" (identical to VS21), which is
//    the element list itself: `required: true, required_confirmed: true`. It states nothing about enabler types. The type pickers are
//    `[required]="false"` (S22:13,18) -> subfields optional. Option list: `complementary_innovation_enabler_types` is seeded by migration
//    1686314961010 (ids 1-35, ids 4 and 7 absent, levels 0 = group header, 1 = parent checkbox, 2 = child checkbox), but admins could add rows
//    and nothing proves it is a closed set, so it stays a REFERENCE list (not in closed-control-lists).
//    The two keys read the SAME column (`results_innovatio_packages_enabler_type.complementary_innovation_enable_type_id`, one row per ticked
//    type of either level; results-innovation-packages-enabler-type.repository.ts createResultInnovationPackages writes both arrays); they are split by the `level` of the referenced type (a path step into the
//    reference table filtered by `level`), so each key returns exactly the types of its level (DD-13).
import { CatalogField, CatalogSection, CatalogSubField } from '../types';
import { FROM_2026, whenEq } from './shared';
import {
  col,
  IPSR_ELEMENT_TABLE,
  IPSR_TYPES,
  ROLE_COMPLEMENTARY,
} from './ipsr-shared';

const COMPLEMENTARY = 'results_complementary_innovation';
const COMPLEMENTARY_FUNCTION = 'results_complementary_innovations_function';
const ENABLER_TYPE = 'results_innovatio_packages_enabler_type';
const ENABLER_TYPES_LIST = 'complementary_innovation_enabler_types';
/** `result_type_id` of the child result the modal creates (`ResultTypeEnum`, W2:299). */
const CHILD_COMPLEMENTARY_TYPE = 11;
const ELEMENT_FILTER = { ipsr_role_id: ROLE_COMPLEMENTARY, is_active: 1 };

/** The element's own result (`result_id -> id`): the hop to `result.title` / `.description` / `.result_type_id`. */
const resultStep = {
  table: 'result',
  join: [{ from: 'result_id', to: 'id' }],
};
/** The element's `results_complementary_innovation` row (exists only for a modal-created child). */
const complementaryStep = {
  table: COMPLEMENTARY,
  join: [{ from: 'result_id', to: 'result_id' }],
  filter: { is_active: 1 },
};

/** Subfield whose value is read through the element's result (`result_id -> id`). */
const viaResult = (
  key: string,
  label: string,
  type: CatalogSubField['type'],
  column: string,
  control_list?: string,
  rule: Partial<CatalogSubField> = {},
): CatalogSubField => ({
  key,
  label,
  type,
  ...(control_list ? { control_list } : {}),
  ...rule,
  storage: { kind: 'path', steps: [resultStep], value_column: column },
});

/** Subfield whose value is a column of the element's `results_complementary_innovation` row. */
const viaComplementary = (
  key: string,
  label: string,
  type: CatalogSubField['type'],
  column: string,
  rule: Partial<CatalogSubField> = {},
): CatalogSubField => ({
  key,
  label,
  type,
  ...rule,
  storage: { kind: 'path', steps: [complementaryStep], value_column: column },
});

/** Modal-created child: `result_type = 11` (S21M creates a type 11 result; table-picked elements are other types). */
const IS_CHILD = whenEq('result_type', CHILD_COMPLEMENTARY_TYPE);
const CHILD_ONLY = { visible_when: IS_CHILD };
const CHILD_REQUIRED = { visible_when: IS_CHILD, required_when: IS_CHILD };

export const IPSR_S21_BUNDLE_SECTION: CatalogSection = {
  key: 'ipsr_s21_bundle',
  label: 'Complementary innovations, enablers and solutions',
  order: 84,
  result_types: IPSR_TYPES,
  ...FROM_2026,
};

export const IPSR_S22_BASIC_INFO_SECTION: CatalogSection = {
  key: 'ipsr_s22_basic_info',
  label: 'Basic info on the innovation package elements',
  order: 85,
  result_types: IPSR_TYPES,
  ...FROM_2026,
};

/** Identity of a bundle element: the id of its result (the same value the relation field `value_column` reads). */
const elementIdentity = (): CatalogSubField => ({
  key: 'result',
  label: 'Complementary innovation/ enabler/ solution',
  type: 'single_select',
  control_list: 'ipsr_bundle_candidates',
  required: true,
  storage: col(IPSR_ELEMENT_TABLE, 'result_id'),
});

/** Types of enabler of ONE level that the element has ticked: element -> its stored types -> the referenced type, filtered by `level`. */
const enablerTypes = (level: number): CatalogSubField['storage'] => ({
  kind: 'path',
  steps: [
    {
      table: ENABLER_TYPE,
      join: [
        {
          from: 'result_by_innovation_package_id',
          to: 'result_by_innovation_package_id',
        },
      ],
      filter: { is_active: 1 },
    },
    {
      table: ENABLER_TYPES_LIST,
      join: [
        {
          from: 'complementary_innovation_enable_type_id',
          to: 'complementary_innovation_enabler_types_id',
        },
      ],
      filter: { level },
    },
  ],
  value_column: 'complementary_innovation_enabler_types_id',
});

export const IPSR_STEP_2_FIELDS: CatalogField[] = [
  {
    key: 'ipsr_step_2_1.complementary_innovations',
    label:
      'Please select PRMS-reported Innovation Development that form a bundle with the core innovation',
    description:
      'Please consider the inclusion of other innovations that CGIAR and partners are already working on and that have been reported in the PRMS.',
    type: 'list',
    section: IPSR_S21_BUNDLE_SECTION.key,
    order: 1,
    result_types: IPSR_TYPES,
    required: true,
    required_confirmed: true,
    ...FROM_2026,
    storage: {
      kind: 'relation',
      table: IPSR_ELEMENT_TABLE,
      fk_to_result: 'result_innovation_package_id',
      value_column: 'result_id',
      filter: ELEMENT_FILTER,
    },
    subfields: [
      elementIdentity(),
      // The element's own result type: 11 = created in the modal, anything else = a PRMS result picked from the table (S21:14-25).
      viaResult(
        'result_type',
        'Result type of the element',
        'single_select',
        'result_type_id',
        'result_types',
      ),
      // S21M:33-38 `[required]="true"`, max 10 words; W2:284-293 rejects an empty short title.
      viaComplementary(
        'short_title',
        'Short title',
        'text',
        'short_title',
        CHILD_REQUIRED,
      ),
      // S21M:48-54 `[required]="true"`, max 30 words; stored as the child result's `title` (W2:295).
      viaResult(
        'title',
        'Long title',
        'text',
        'title',
        undefined,
        CHILD_REQUIRED,
      ),
      // S21M:65-71 optional, max 150 words; the child result's `description` (W2:296).
      viaResult(
        'description',
        'Description / other information',
        'text',
        'description',
        undefined,
        CHILD_ONLY,
      ),
      // S21M:73-96 checkbox grid; the real rule is "a function OR other functions" (see header), so no `required_when`.
      {
        key: 'functions',
        label: 'Function',
        type: 'multi_select',
        control_list: 'complementary_functions',
        ...CHILD_ONLY,
        storage: {
          kind: 'path',
          steps: [
            complementaryStep,
            {
              table: COMPLEMENTARY_FUNCTION,
              join: [
                {
                  from: 'result_complementary_innovation_id',
                  to: 'result_complementary_innovation_id',
                },
              ],
              filter: { is_active: 1 },
            },
          ],
          value_column: 'complementary_innovation_function_id',
        },
      },
      // S21M:98-108 optional ("Other enabler functions"); column name keeps the repo typo `other_funcions`.
      viaComplementary(
        'other_functions',
        'Other enabler functions',
        'text',
        'other_funcions',
        CHILD_ONLY,
      ),
      // S21M:110-119 `[required]="true"`; W2:329-339 rejects null.
      viaComplementary(
        'projects_organizations_working_on_innovation',
        'Are you aware of any projects or organizations already working on this complementary innovation/ enabler/ solution?',
        'boolean',
        'projects_organizations_working_on_innovation',
        CHILD_REQUIRED,
      ),
      // S21M:123-129 shown only for Yes; optional; stored NULL for No (W2:349-351).
      viaComplementary(
        'specify_projects_organizations',
        'Please specify those projects or organizations.',
        'text',
        'specify_projects_organizations',
        {
          visible_when: {
            all: [
              IS_CHILD,
              whenEq('projects_organizations_working_on_innovation', true),
            ],
          },
        },
      ),
    ],
  },
  {
    key: 'ipsr_step_2_2.enabler_elements',
    label: 'Basic info on the innovation package elements',
    type: 'list',
    section: IPSR_S22_BASIC_INFO_SECTION.key,
    order: 1,
    result_types: IPSR_TYPES,
    // VS22:7-27 (identical to VS21) needs >= 1 active role-2 element: the element list itself. It states no rule on the enabler types.
    required: true,
    required_confirmed: true,
    ...FROM_2026,
    storage: {
      kind: 'relation',
      table: IPSR_ELEMENT_TABLE,
      fk_to_result: 'result_innovation_package_id',
      value_column: 'result_id',
      filter: ELEMENT_FILTER,
    },
    subfields: [
      elementIdentity(),
      // S22:13-29 `[required]="false"`; parent-level checkboxes (types whose `level` is 1), grouped by their level-0 header.
      {
        key: 'enabler_type_level_1',
        label: 'Type of enabler',
        type: 'multi_select',
        control_list: ENABLER_TYPES_LIST,
        storage: enablerTypes(1),
      },
      // S22:30-45 `[required]="false"`; child checkboxes (level 2), ticking one ticks its parent (S22.ts:118-140).
      {
        key: 'enabler_type_level_2',
        label: 'Type of enabler (sub-level)',
        type: 'multi_select',
        control_list: ENABLER_TYPES_LIST,
        storage: enablerTypes(2),
      },
    ],
  },
];
