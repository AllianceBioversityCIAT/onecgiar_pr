// @akili-spec quality-assurance/qa-field-catalog
// QAC-T-8 · inventory 2026-A §4 C-2 (`toc_alignment`). Keys frozen as written in the inventory.
// Deferred to PENDING_CATALOG (see pending-catalog.ts): `toc.entries.indicator` and
// `toc.entries.contribution_to_target` (2-hop bindings, REVIEW D2).
import { CatalogField, CatalogSection } from '../types';
import { ALL_TYPES, FROM_2026, whenEq } from './shared';

export const TOC_ALIGNMENT_SECTION: CatalogSection = {
  key: 'toc_alignment',
  label: 'Theory of change alignment',
  order: 20,
  result_types: ALL_TYPES,
  ...FROM_2026,
};

const SECTION = TOC_ALIGNMENT_SECTION.key;

export const TOC_ALIGNMENT_FIELDS: CatalogField[] = [
  {
    key: 'toc.planned_result',
    label: 'Can this result be mapped to a ToC KPI?',
    description:
      "If Yes, please select the relevant level, KPI, and indicate the result contribution to the target. If No, please provide a short justification explaining why this result is being reported outside the 2026 ToC KPI. No-mapped results will be shared with the Program team for consideration as part of the adaptive management process, and may feed into updates to the Program's 2027 ToC.",
    type: 'boolean',
    section: SECTION,
    order: 1,
    result_types: ALL_TYPES,
    required: true,
    required_confirmed: true,
    ...FROM_2026,
    storage: {
      kind: 'column',
      table: 'results_toc_result',
      column: 'planned_result',
    },
  },
  {
    key: 'toc.program_invested_financial_resources',
    label:
      'Did the Program invest financial resources in the achievement of this result?',
    description:
      "Select 'Yes' if direct program funds were utilized to achieve this result. Select 'No' if the result was achieved organically (e.g., policy influence) without financial investment from the program.",
    type: 'boolean',
    section: SECTION,
    order: 2,
    result_types: ALL_TYPES,
    // No live rule (client-only): the client requires it when the result is not mapped to a ToC KPI.
    required: false,
    required_confirmed: false,
    required_when: whenEq('toc.planned_result', false),
    ...FROM_2026,
    storage: {
      kind: 'column',
      table: 'results_toc_result',
      column: 'program_invested_financial_resources',
    },
  },
  {
    key: 'toc.narrative',
    label: 'Why is the result being reported?',
    type: 'text',
    section: SECTION,
    order: 3,
    result_types: ALL_TYPES,
    required: false,
    required_confirmed: true,
    required_when: whenEq('toc.planned_result', false),
    ...FROM_2026,
    storage: {
      kind: 'column',
      table: 'results_toc_result',
      column: 'toc_progressive_narrative',
    },
  },
  {
    key: 'toc.entries',
    label: 'ToC contributions',
    type: 'list',
    section: SECTION,
    order: 4,
    result_types: ALL_TYPES,
    required: false,
    required_confirmed: true,
    required_when: whenEq('toc.planned_result', true),
    ...FROM_2026,
    storage: {
      kind: 'relation',
      table: 'results_toc_result',
      fk_to_result: 'results_id',
      value_column: 'result_toc_result_id',
      filter: { is_active: 1 },
    },
    subfields: [
      {
        key: 'level',
        label: 'Level',
        type: 'single_select',
        control_list: 'toc_levels',
        // no live rule (owner: validation_toc_P25 not needed); the client requires it
        required: false,
        storage: {
          kind: 'column',
          table: 'results_toc_result',
          column: 'toc_level_id',
        },
      },
      {
        key: 'toc_result',
        label: 'ToC result',
        type: 'single_select',
        control_list: 'toc_results',
        required: false,
        storage: {
          kind: 'column',
          table: 'results_toc_result',
          column: 'toc_result_id',
        },
      },
    ],
  },
];
