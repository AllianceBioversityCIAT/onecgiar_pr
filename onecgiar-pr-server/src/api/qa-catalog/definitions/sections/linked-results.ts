// @akili-spec quality-assurance/qa-field-catalog
// QAC-T-8 · inventory 2026-A §4 C-6 (`linked_results`). Keys frozen as written in the inventory.
// `linked.results` is typed `multi_select` (a pick list of results) rather than the inventory's
// `list (multi)`: its only subfield (`legacy_link`) is stage 2, and a `list` needs a subfield.
import { CatalogField, CatalogSection } from '../types';
import { ALL_TYPES, FROM_2026, whenEq } from './shared';

export const LINKED_RESULTS_SECTION: CatalogSection = {
  key: 'linked_results',
  label: 'Links to results',
  order: 70,
  result_types: ALL_TYPES,
  ...FROM_2026,
};

const SECTION = LINKED_RESULTS_SECTION.key;

export const LINKED_RESULTS_FIELDS: CatalogField[] = [
  {
    key: 'linked.has_innovation_link',
    label:
      'Is this result linked or bundled with another CGIAR-reported result (such as innovation, KP, policy, etc.)?',
    type: 'boolean',
    section: SECTION,
    order: 1,
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
    order: 2,
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
