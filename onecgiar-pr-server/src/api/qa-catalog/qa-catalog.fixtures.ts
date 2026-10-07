// @akili-spec quality-assurance/qa-field-catalog
import { QaCatalogSource } from './qa-catalog.service';

/** Table / column names that must never reach a response (QAC-R-4). */
export const FIXTURE_SECRET_NAMES = [
  'results_secret_table',
  'secret_column',
  'secret_link_table',
  'secret_value_column',
  'secret_fk',
  'secret_control_table',
  'secret_sub_table',
  'secret_sub_column',
];

/**
 * Fixture catalog. Deliberately declared OUT of order (sections, fields) so ordering tests
 * discriminate, and every field/subfield carries a storage binding with the secret names above.
 *  - general.title            2025+            ['*']
 *  - general.legacy_note      2025 only        (retired — QAC-R-3)
 *  - general.countries        2025+            relation binding
 *  - innovation.readiness     2026+            subfields
 *  - legacy.old_policy        2025 only        section `legacy` is 2025 only, policy_change only
 */
export const FIXTURE_SOURCE: QaCatalogSource = {
  versions: {
    2025: { portfolio: 'P22', revision: 2 },
    2026: { portfolio: 'P25', revision: 3 },
  },
  resultTypes: [
    { key: 'policy_change', label: 'Policy change', level: 'outcome' },
    {
      key: 'innovation_development',
      label: 'Innovation development',
      level: 'output',
    },
    { key: 'knowledge_product', label: 'Knowledge product', level: 'output' },
  ],
  sections: [
    {
      key: 'legacy',
      label: 'Legacy',
      order: 3,
      valid_from: 2025,
      valid_to: 2025,
      result_types: ['policy_change'],
    },
    {
      key: 'innovation',
      label: 'Innovation',
      order: 2,
      valid_from: 2025,
      valid_to: null,
      result_types: ['innovation_development'],
    },
    {
      key: 'general',
      label: 'General information',
      order: 1,
      valid_from: 2025,
      valid_to: null,
      result_types: ['*'],
    },
  ],
  fields: [
    {
      key: 'innovation.readiness',
      label: 'Readiness',
      type: 'single_select',
      control_list: 'readiness_levels',
      section: 'innovation',
      order: 1,
      result_types: ['innovation_development'],
      required: true,
      required_confirmed: true,
      valid_from: 2026,
      valid_to: null,
      storage: {
        kind: 'column',
        table: 'results_secret_table',
        column: 'secret_column',
      },
      subfields: [
        {
          key: 'justification',
          label: 'Justification',
          type: 'text',
          required: true,
          storage: {
            kind: 'column',
            table: 'secret_sub_table',
            column: 'secret_sub_column',
          },
        },
      ],
    },
    {
      key: 'legacy.old_policy',
      label: 'Old policy',
      type: 'text',
      section: 'legacy',
      order: 1,
      result_types: ['policy_change'],
      required: false,
      required_confirmed: false,
      valid_from: 2025,
      valid_to: 2025,
      storage: {
        kind: 'column',
        table: 'results_secret_table',
        column: 'secret_column',
      },
    },
    {
      key: 'general.countries',
      label: 'Countries',
      description: 'Countries covered',
      type: 'multi_select',
      control_list: 'countries',
      section: 'general',
      order: 2,
      result_types: ['*'],
      required: false,
      required_confirmed: true,
      valid_from: 2025,
      valid_to: null,
      storage: {
        kind: 'relation',
        table: 'secret_link_table',
        fk_to_result: 'secret_fk',
        value_column: 'secret_value_column',
        control_list_table: 'secret_control_table',
      },
    },
    {
      key: 'general.legacy_note',
      label: 'Legacy note',
      type: 'text',
      section: 'general',
      order: 3,
      result_types: ['*'],
      required: false,
      required_confirmed: true,
      valid_from: 2025,
      valid_to: 2025,
      storage: {
        kind: 'column',
        table: 'results_secret_table',
        column: 'secret_column',
      },
    },
    {
      key: 'general.title',
      label: 'Title',
      type: 'text',
      section: 'general',
      order: 1,
      result_types: ['*'],
      required: true,
      required_confirmed: true,
      valid_from: 2025,
      valid_to: null,
      storage: {
        kind: 'column',
        table: 'results_secret_table',
        column: 'secret_column',
      },
    },
  ],
};

/** QAC-T-14: names carried only by the path / lookup bindings of FIXTURE_NESTED_SOURCE. */
export const FIXTURE_NESTED_SECRET_NAMES = [
  'secret_path_table_a',
  'secret_path_table_b',
  'secret_join_from',
  'secret_join_to',
  'secret_path_value',
  'secret_extra_column',
  'secret_filter_column',
  'secret_lookup_source',
  'secret_key_from',
  'secret_lookup_value',
  'secret_nested_table',
  'secret_nested_column',
];

/**
 * QAC-T-14 fixture: one 2026 list field with display rules (field and subfield level), depth-2
 * subfields, and path + lookup bindings. Kept apart from FIXTURE_SOURCE, whose exact field lists
 * other suites assert.
 */
export const FIXTURE_NESTED_SOURCE: QaCatalogSource = {
  versions: FIXTURE_SOURCE.versions,
  resultTypes: FIXTURE_SOURCE.resultTypes,
  sections: FIXTURE_SOURCE.sections,
  fields: [
    {
      key: 'general.gate',
      label: 'Gate',
      type: 'boolean',
      section: 'general',
      order: 1,
      result_types: ['*'],
      required: true,
      required_confirmed: true,
      valid_from: 2026,
      valid_to: null,
      storage: {
        kind: 'column',
        table: 'secret_nested_table',
        column: 'secret_nested_column',
      },
    },
    {
      key: 'general.programs',
      label: 'Programs',
      type: 'list',
      section: 'general',
      order: 2,
      result_types: ['*'],
      required: false,
      required_confirmed: false,
      required_when: {
        all: [
          { field: 'general.gate', operator: 'eq', value: true },
          { field: 'result_type', operator: 'in', value: ['policy_change'] },
        ],
      },
      visible_when: { field: 'general.gate', operator: 'not_null' },
      valid_from: 2026,
      valid_to: null,
      storage: {
        kind: 'path',
        steps: [
          {
            table: 'secret_path_table_a',
            join_from: 'secret_join_from',
            join_to: 'secret_join_to',
            filter: { secret_filter_column: 1 },
          },
        ],
        value_column: 'secret_path_value',
        columns: ['secret_extra_column'],
      },
      subfields: [
        {
          key: 'program',
          label: 'Program',
          type: 'single_select',
          control_list: 'programs',
          required: false,
          required_when: { field: 'general.gate', operator: 'eq', value: true },
          visible_when: {
            any: [{ field: 'general.gate', operator: 'eq', value: true }],
          },
          storage: {
            kind: 'column',
            table: 'secret_nested_table',
            column: 'secret_nested_column',
          },
        },
        {
          key: 'mappings',
          label: 'Mappings',
          type: 'list',
          storage: {
            kind: 'path',
            steps: [
              {
                table: 'secret_path_table_b',
                join_from: 'secret_join_from',
                join_to: 'secret_join_to',
              },
            ],
            value_column: 'secret_path_value',
          },
          subfields: [
            {
              key: 'indicator',
              label: 'Indicator',
              type: 'text',
              storage: {
                kind: 'lookup',
                source: 'secret_lookup_source',
                key_from: 'secret_key_from',
                value_column: 'secret_lookup_value',
              },
            },
          ],
        },
      ],
    },
    {
      // QAC-T-14 projection pin: carries EVERY optional key the mapper can emit, at every level
      // (field description / control_list / required_when / visible_when, subfield and depth-2
      // control_list / required / required_when / visible_when, every condition shape).
      key: 'general.regions',
      label: 'Regions',
      description: 'Regions the result reports on',
      type: 'list',
      control_list: 'regions',
      section: 'general',
      order: 3,
      result_types: ['*'],
      required: false,
      required_confirmed: false,
      required_when: { field: 'general.gate', operator: 'in', value: ['x'] },
      visible_when: {
        any: [
          { field: 'general.gate', operator: 'eq', value: true },
          { field: 'result_type', operator: 'in', value: ['policy_change'] },
        ],
      },
      valid_from: 2026,
      valid_to: null,
      storage: {
        kind: 'column',
        table: 'secret_nested_table',
        column: 'secret_nested_column',
      },
      subfields: [
        {
          key: 'region',
          label: 'Region',
          type: 'single_select',
          control_list: 'regions',
          required: true,
          required_when: { field: 'general.gate', operator: 'not_null' },
          visible_when: { field: 'general.gate', operator: 'eq', value: 'yes' },
          storage: {
            kind: 'column',
            table: 'secret_nested_table',
            column: 'secret_nested_column',
          },
          subfields: [
            {
              key: 'subregion',
              label: 'Subregion',
              type: 'multi_select',
              control_list: 'subregions',
              required: false,
              required_when: {
                field: 'general.gate',
                operator: 'in',
                value: ['a', 'b'],
              },
              visible_when: {
                all: [
                  { field: 'general.gate', operator: 'not_null' },
                  { field: 'general.gate', operator: 'eq', value: false },
                ],
              },
              storage: {
                kind: 'column',
                table: 'secret_nested_table',
                column: 'secret_nested_column',
              },
            },
          ],
        },
      ],
    },
  ],
};
