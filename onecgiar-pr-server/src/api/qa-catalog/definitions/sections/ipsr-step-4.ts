// @akili-spec quality-assurance/qa-field-catalog
// QAC-T-11 · inventory 2026-B §3.8 (IPSR step 4, S4 components). Keys frozen as written there.
//
// Catalogued here: the reference materials only. The three required investment rows (`*.kind_cash`, VS4:45-103) are
// budget rows reached through `results_by_inititiative` / `results_by_projects` / `results_by_institution` (2-hop,
// REVIEW D2): their columns are already PENDING_CATALOG (QAC-T-9) and this task adds the step 4 keys to those reasons.
// The scaling-studies question is retired in 2026 (REVIEW D20) and is absent.
//
// REVIEW D12 (b): every reference link is mandatory per row in the form (`type=link`, S4R:10) but no live rule tests
// it -> the list enters stage 1 as optional and unconfirmed. `evidence_type_id = 4` is the materials type; common
// evidence (QAC-T-8, type 1) and the step 3 evidence (type 7) are other bindings of the same table.
import { CatalogField, CatalogSection } from '../types';
import { FROM_2026 } from './shared';
import { IPSR_TYPES, sub } from './ipsr-shared';

export const IPSR_S4_MATERIALS_SECTION: CatalogSection = {
  key: 'ipsr_s4_materials',
  label: 'Reference materials',
  order: 89,
  result_types: IPSR_TYPES,
  ...FROM_2026,
};

// `description` keeps only the first help sentence of the list. The second sentence the client shows on this block
// ("The image(s) will be used in the final report, therefore consent to use the image(s) is needed." -- the GDPR/image
// consent note) belongs to the image upload, not to the links list, and is dropped on purpose (inventory 2026-B §3.8).
export const IPSR_STEP_4_FIELDS: CatalogField[] = [
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
    subfields: [sub('evidence', 'link', 'Link', 'text')],
  },
];
