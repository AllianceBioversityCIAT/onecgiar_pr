// @akili-spec quality-assurance/qa-field-catalog
// QAC-T-11 / QAC-T-31 · inventory 2026-B §3.8 (IPSR step 4, S4 components). Keys frozen as written there.
//
// Catalogued here (QAC-T-31): the three anticipated-investment tables and the reference materials. The tables are the same
// budget rows the innovation development / innovation use pages edit, reached 2-hop through the parent rows
// `results_by_inititiative` / `results_by_projects` / `results_by_institution` (REVIEW D2; the budget row hangs off the PARENT
// row id). The budget columns are bound by several keys (innovation_dev.estimates_*, innovation_use.investment.*,
// ipsr_step_4.*_investment): the bindings are identical, `result_types` decides which key applies, and each key returns exactly
// the elements of its own list (DD-13).
//
// Row rule (VS4:45-103, function-stated, `required_confirmed: true` on the lists): every active budget row whose `is_determined` is
// NULL or 0 needs `kind_cash` NOT NULL -> `kind_cash` is `required_when is_determined = false` (NULL is read as false: "not marked",
// known gap 14). `is_determined` stays optional: its half of the either-or cannot be written (no negation of `eq`). The form keeps the
// USD input visible but DISABLED while "yet to be determined" is ticked (S4I:71, S4B:84, S4P:71) -> no `visible_when`.
// The lists themselves are not user-required (rows are system-provided; the tables' headers are `[required]="false"`); the
// feedback marker of the programs table asks for >= 1 row (S4I:7-10) but VS4 has no such rule.
//
// Partners: the elements are every active `results_by_institution` row of ANY role (a relation filter is equality only; same as
// innovation_use.investment.partners). The form lists only roles 2 (partner) and 7 (expected partner) that have an active budget row
// (getter ipsr-pathway-step-four.service.ts:598-633; the P25 reader keeps role-2 partners without `is_active`, :600-603). Role 5
// scaling partners (created in step 1 without a budget row, innovation-pathway-step-one.service.ts:970-976) are elements with no
// budget row and carry no requirement; VS4:65-83 flags a row of another role only if it has an active budget row.
// DEVIATION: the inventory condition "row exists AND is_determined is NULL/0" (2026-B:347,351,354) is not stated: the model has no key
// to condition on budget-row existence. The row rule applies only to elements that HAVE an active budget row; an element without
// one reads `kind_cash` and `is_determined` as null and is NOT missing (Known gap 14).
//
// The scaling-studies question (`result_innovation_package.has_scaling_studies`, `result_scaling_study_urls`) is retired from 2026
// (REVIEW D20; VS4:37-43,105-120 only apply to phases <= 2025): absent here and PENDING_CATALOG as legacy for an older load.
//
// REVIEW D12 (b): every reference link is mandatory per row in the form (`type=link`, S4R:10) but no live rule tests it -> the list
// stays optional and unconfirmed while its `link` subfield is required. `evidence_type_id = 4` is the materials type; common
// evidence (QAC-T-8, type 1) and the step 3 evidence (type 7) are other bindings of the same table.
import { CatalogField, CatalogSection } from '../types';
import { FROM_2026 } from './shared';
import { IPSR_TYPES, sub } from './ipsr-shared';
import { budgetSubfields } from './innovation-use';

export const IPSR_S4_INVESTMENT_SECTION: CatalogSection = {
  key: 'ipsr_s4_investment',
  label:
    'Anticipated investment in improving the scaling readiness of the innovation package',
  order: 89,
  result_types: IPSR_TYPES,
  ...FROM_2026,
};

export const IPSR_S4_MATERIALS_SECTION: CatalogSection = {
  key: 'ipsr_s4_materials',
  label: 'Reference materials',
  order: 90,
  result_types: IPSR_TYPES,
  ...FROM_2026,
};

// `description` keeps only the first help sentence of the list. The second sentence the client shows on this block
// ("The image(s) will be used in the final report, therefore consent to use the image(s) is needed." -- the GDPR/image
// consent note) belongs to the image upload, not to the links list, and is dropped on purpose (inventory 2026-B §3.8).
const investmentBase = {
  section: IPSR_S4_INVESTMENT_SECTION.key,
  result_types: IPSR_TYPES,
  // Rows are system-provided (one per linked entity); VS4 states the row rule (above).
  required: false,
  required_confirmed: true,
  ...FROM_2026,
};

export const IPSR_STEP_4_FIELDS: CatalogField[] = [
  {
    ...investmentBase,
    // S4I:5-20,44-85 (one row per active initiative row, any role); VS4:85-103. Help text: S4I:2 usdQuestionDescription().
    key: 'ipsr_step_4.initiative_investment',
    label:
      'Estimation of total USD-value of investment by CGIAR Programs during the reporting period',
    description:
      'The USD-value here can be an estimation and will be used to get an overall impression of the expected investment in improving the Scaling Readiness of the innovation package.',
    type: 'list',
    order: 1,
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
    // S4B:3-11,36-106 (one row per active project row, added with the 'Add project' dialog S4A:12-22); VS4:45-63.
    key: 'ipsr_step_4.bilateral_investment',
    label:
      'Estimated total USD-value of investment by CGIAR W3 or bilateral projects during the reporting period',
    type: 'list',
    order: 4,
    storage: {
      kind: 'relation',
      table: 'results_by_projects',
      fk_to_result: 'result_id',
      value_column: 'project_id',
      filter: { is_active: 1 },
    },
    subfields: [
      {
        // dialog control (S4A:14-22, UI-required) that creates the row; no live rule
        key: 'project',
        label: 'Contributing W3 and/or bilateral projects',
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
    // S4P:3-12,38-92 (no add dialog in P25, S4P:97-99; rows come from the package's partners); VS4:65-83 (any role, see the header).
    key: 'ipsr_step_4.partner_investment',
    label:
      'Estimated total USD-value of (co-)investment by partners during the reporting period',
    type: 'list',
    order: 8,
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
        // read-only "Institution type" under the partner name (S4P:41-43)
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
  {
    key: 'ipsr_step_4.reference_materials',
    label:
      'Provide any reference materials that show the Innovation Package in action/ use',
    description:
      'Reference materials may include (science) publications, websites, newsletters, reports, newspaper articles, videos, etc.',
    type: 'list',
    section: IPSR_S4_MATERIALS_SECTION.key,
    order: 11,
    result_types: IPSR_TYPES,
    required: false,
    required_confirmed: false,
    ...FROM_2026,
    storage: {
      kind: 'relation',
      table: 'evidence',
      fk_to_result: 'result_id',
      value_column: 'link',
      filter: { evidence_type_id: 4, is_active: 1 },
    },
    // S4R:10 `[required]="true"`: every row needs its link (UI-only; blank rows are dropped on save)
    subfields: [
      sub('evidence', 'link', 'Link', 'text', 'link', undefined, {
        required: true,
      }),
    ],
  },
];
