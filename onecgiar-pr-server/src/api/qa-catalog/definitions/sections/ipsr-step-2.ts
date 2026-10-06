// @akili-spec quality-assurance/qa-field-catalog
// QAC-T-11 · inventory 2026-B §3.5 (step 2.1) and §3.6 (step 2.2). Keys frozen as written there.
//
// Decisions (owner mandate 2026-10-06, no model change):
//  - `ipsr_step_2_1.complementary_innovations` (required, VS21:7-27: at least one active role-2 element): the inventory
//    types it `list`, but its sub-fields describe the CHILD complementary result created in the modal (short title,
//    functions, ... stored in `results_complementary_innovation` through the child result: 2-hop, REVIEW D2, PENDING_CATALOG).
//    A `list` without subfields is shape-invalid, so the selection itself is catalogued as a `multi_select` over the
//    control list `ipsr_bundle_candidates` (result ids, as `linked.results` does); the binding is one hop
//    (`result_by_innovation_package.result_innovation_package_id`, role 2, value = the element result id).
//  - Step 2.2 (`ipsr_step_2_2.*`, admin-only tab, REVIEW D19) has no live rule (VS22 is identical to VS21) -> every row
//    is PENDING_CATALOG, so this file defines no section for it.
import { CatalogField, CatalogSection } from '../types';
import { FROM_2026 } from './shared';
import {
  IPSR_ELEMENT_TABLE,
  IPSR_TYPES,
  ROLE_COMPLEMENTARY,
} from './ipsr-shared';

export const IPSR_S21_BUNDLE_SECTION: CatalogSection = {
  key: 'ipsr_s21_bundle',
  label: 'Complementary innovations, enablers and solutions',
  order: 82,
  result_types: IPSR_TYPES,
  ...FROM_2026,
};

// Note: `multi_select` over `ipsr_bundle_candidates` approximates a list of child results (each row is a role-2 element
// pointing at another result). When REVIEW D2 is solved this becomes a type change (relation to child results).
export const IPSR_STEP_2_FIELDS: CatalogField[] = [
  {
    key: 'ipsr_step_2_1.complementary_innovations',
    label:
      'Please select PRMS-reported Innovation Development that form a bundle with the core innovation',
    description:
      'Please consider the inclusion of other innovations that CGIAR and partners are already working on and that have been reported in the PRMS.',
    type: 'multi_select',
    control_list: 'ipsr_bundle_candidates',
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
      filter: { ipsr_role_id: ROLE_COMPLEMENTARY, is_active: 1 },
    },
  },
];
