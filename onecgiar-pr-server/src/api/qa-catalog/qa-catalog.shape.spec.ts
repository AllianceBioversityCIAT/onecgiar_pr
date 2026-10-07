// @akili-spec quality-assurance/qa-field-catalog
import { CATALOG_RESULT_TYPES } from './definitions/result-types';
import { CATALOG_FIELDS, CATALOG_SECTIONS } from './definitions/sections';
import { NOT_FOR_QA } from './definitions/not-for-qa';
import { CATALOG_VERSIONS } from './definitions/versions';
import { validateCatalogShape } from './definitions/shape-validator';
import { isValidIn } from './definitions/validity';
import {
  CatalogDefinition,
  CatalogField,
  CatalogSection,
} from './definitions/types';

/**
 * QAC-T-1 — shape rules of QAC-R-1 / QAC-R-3 / QAC-R-7.
 * Every fixture is the valid baseline with exactly ONE deliberate violation, and each test
 * asserts the full error list (rule + path), so a fixture that is malformed elsewhere fails.
 */
const section = (over: Partial<CatalogSection> = {}): CatalogSection => ({
  key: 'general',
  label: 'General',
  order: 1,
  result_types: ['*'],
  valid_from: 2026,
  valid_to: null,
  ...over,
});

const field = (over: Partial<CatalogField> = {}): CatalogField => ({
  key: 'general.title',
  label: 'Title',
  type: 'text',
  section: 'general',
  order: 1,
  result_types: ['*'],
  required: true,
  required_confirmed: false,
  valid_from: 2026,
  valid_to: null,
  storage: { kind: 'column', table: 'result', column: 'title' },
  ...over,
});

const catalog = (over: Partial<CatalogDefinition> = {}): CatalogDefinition => ({
  resultTypes: [
    { key: 'policy_change', label: 'Policy change', level: 'outcome' },
    { key: 'other_output', label: 'Other output', level: 'output' },
  ],
  sections: [section()],
  fields: [field()],
  notForQa: [],
  ...over,
});

const subfield = {
  key: 'name',
  label: 'Name',
  type: 'text' as const,
  storage: { kind: 'column' as const, table: 't', column: 'name' },
};

describe('validateCatalogShape', () => {
  it('accepts the valid baseline fixture (control: no rule fires by accident)', () => {
    expect(validateCatalogShape(catalog())).toEqual([]);
  });

  it('QAC-R-1: rejects a select without control_list and accepts the one that has it', () => {
    const errors = validateCatalogShape(
      catalog({
        fields: [
          field({
            key: 'general.with_list',
            type: 'single_select',
            control_list: 'countries',
          }),
          field({ key: 'general.no_list', type: 'single_select', order: 2 }),
        ],
      }),
    );
    expect(errors).toEqual([
      expect.objectContaining({
        rule: 'SELECT_WITHOUT_CONTROL_LIST',
        path: 'field:general.no_list',
      }),
    ]);
  });

  it('QAC-R-1: rejects a multi_select field and a select subfield without control_list', () => {
    const errors = validateCatalogShape(
      catalog({
        fields: [
          field({ key: 'general.multi', type: 'multi_select' }),
          field({
            key: 'general.group',
            type: 'list',
            order: 2,
            subfields: [{ ...subfield, key: 'kind', type: 'single_select' }],
          }),
        ],
      }),
    );
    expect(errors).toEqual([
      expect.objectContaining({
        rule: 'SELECT_WITHOUT_CONTROL_LIST',
        path: 'field:general.multi',
      }),
      expect.objectContaining({
        rule: 'SELECT_WITHOUT_CONTROL_LIST',
        path: 'field:general.group/subfield:kind',
      }),
    ]);
  });

  it.each(['list', 'object'] as const)(
    'QAC-R-1: rejects a %s field without subfields',
    (type) => {
      const errors = validateCatalogShape(
        catalog({ fields: [field({ key: 'general.group', type })] }),
      );
      expect(errors).toEqual([
        expect.objectContaining({
          rule: 'STRUCTURED_WITHOUT_SUBFIELDS',
          path: 'field:general.group',
        }),
      ]);
    },
  );

  it('QAC-R-1: rejects a list field whose subfields array is empty, accepts one with a subfield', () => {
    const errors = validateCatalogShape(
      catalog({
        fields: [
          field({ key: 'general.ok', type: 'list', subfields: [subfield] }),
          field({
            key: 'general.empty',
            type: 'list',
            order: 2,
            subfields: [],
          }),
        ],
      }),
    );
    expect(errors).toEqual([
      expect.objectContaining({
        rule: 'STRUCTURED_WITHOUT_SUBFIELDS',
        path: 'field:general.empty',
      }),
    ]);
  });

  it('QAC-R-3: rejects a field with valid_from > valid_to', () => {
    const errors = validateCatalogShape(
      catalog({ fields: [field({ valid_from: 2026, valid_to: 2025 })] }),
    );
    expect(errors).toEqual([
      expect.objectContaining({
        rule: 'INVALID_VALIDITY_RANGE',
        path: 'field:general.title',
      }),
    ]);
  });

  it('QAC-R-3: rejects a section with valid_from > valid_to', () => {
    const errors = validateCatalogShape(
      catalog({ sections: [section({ valid_from: 2027, valid_to: 2026 })] }),
    );
    expect(errors).toEqual([
      expect.objectContaining({
        rule: 'INVALID_VALIDITY_RANGE',
        path: 'section:general',
      }),
    ]);
  });

  it('QAC-R-3: accepts valid_from === valid_to and an open-ended valid_to', () => {
    expect(
      validateCatalogShape(
        catalog({
          fields: [
            field({
              key: 'general.one_year',
              valid_from: 2025,
              valid_to: 2025,
            }),
            field({ key: 'general.open', order: 2, valid_to: null }),
          ],
        }),
      ),
    ).toEqual([]);
  });

  it('QAC-R-1: rejects a duplicate field key', () => {
    const errors = validateCatalogShape(
      catalog({ fields: [field(), field({ order: 2 })] }),
    );
    expect(errors).toEqual([
      expect.objectContaining({
        rule: 'DUPLICATE_KEY',
        path: 'field:general.title',
      }),
    ]);
  });

  it('QAC-R-1: rejects a duplicate section key and a duplicate result type key', () => {
    const errors = validateCatalogShape(
      catalog({
        sections: [section(), section({ order: 2 })],
        resultTypes: [
          { key: 'policy_change', label: 'A', level: 'outcome' },
          { key: 'policy_change', label: 'B', level: 'outcome' },
        ],
        fields: [field({ result_types: ['policy_change'] })],
      }),
    );
    expect(errors).toEqual([
      expect.objectContaining({
        rule: 'DUPLICATE_KEY',
        path: 'resultType:policy_change',
      }),
      expect.objectContaining({
        rule: 'DUPLICATE_KEY',
        path: 'section:general',
      }),
    ]);
  });

  it('QAC-R-1: rejects a field referencing an unknown section', () => {
    const errors = validateCatalogShape(
      catalog({ fields: [field({ section: 'ghost' })] }),
    );
    expect(errors).toEqual([
      expect.objectContaining({
        rule: 'UNKNOWN_SECTION',
        path: 'field:general.title',
      }),
    ]);
  });

  it('QAC-R-1: rejects a field and a section referencing an unknown result type; "*" is accepted', () => {
    const errors = validateCatalogShape(
      catalog({
        sections: [section({ result_types: ['ghost_type'] })],
        fields: [
          field({ result_types: ['policy_change', 'other_ghost'] }),
          field({ key: 'general.all', order: 2, result_types: ['*'] }),
        ],
      }),
    );
    expect(errors).toEqual([
      expect.objectContaining({
        rule: 'UNKNOWN_RESULT_TYPE',
        path: 'section:general',
      }),
      expect.objectContaining({
        rule: 'UNKNOWN_RESULT_TYPE',
        path: 'field:general.title',
      }),
    ]);
  });

  it('QAC-R-7: rejects a NOT_FOR_QA entry with an empty or blank reason, accepts a reasoned one', () => {
    const errors = validateCatalogShape(
      catalog({
        notForQa: [
          {
            table: 'result',
            column: 'created_by',
            reason: 'Audit column, not form data',
          },
          { table: 'result', column: 'updated_by', reason: '' },
          { table: 'result', column: 'last_updated_by', reason: '   ' },
        ],
      }),
    );
    expect(errors).toEqual([
      expect.objectContaining({
        rule: 'EMPTY_NOT_FOR_QA_REASON',
        path: 'notForQa:result.updated_by',
      }),
      expect.objectContaining({
        rule: 'EMPTY_NOT_FOR_QA_REASON',
        path: 'notForQa:result.last_updated_by',
      }),
    ]);
  });
});

describe('validateCatalogShape — QAC-T-14 model extension (QAC-R-13, QAC-R-14, DD-12, DD-13)', () => {
  const eq = (key: string, value: string | number | boolean) => ({
    field: key,
    operator: 'eq' as const,
    value,
  });
  const gate = (over: Partial<CatalogField> = {}) =>
    field({ key: 'general.gate', type: 'boolean', order: 2, ...over });

  it('accepts a visible_when / required_when over an existing key, nested all/any, and the pseudo fields', () => {
    expect(
      validateCatalogShape(
        catalog({
          fields: [
            gate(),
            field({
              key: 'general.detail',
              order: 3,
              visible_when: {
                all: [
                  eq('general.gate', true),
                  { any: [eq('result_type', 'policy_change')] },
                ],
              },
              required_when: eq('general.gate', true),
            }),
          ],
        }),
      ),
    ).toEqual([]);
  });

  it('DD-12: `result_type` is the only pseudo-key; `is_replicated` is not (it is the catalog field `general.is_replicated`)', () => {
    const errors = validateCatalogShape(
      catalog({
        fields: [
          field({ required_when: eq('is_replicated', 1) }),
          field({
            key: 'general.other',
            order: 2,
            required_when: eq('result_type', 'policy_change'),
          }),
        ],
      }),
    );
    expect(errors).toEqual([
      expect.objectContaining({
        rule: 'UNKNOWN_CONDITION_KEY',
        path: 'field:general.title/required_when',
      }),
    ]);
  });

  it.each([
    [
      'an operator outside eq | in | not_null',
      { field: 'general.gate', operator: 'gt', value: 1 },
    ],
    ['a missing operator', { field: 'general.gate', value: 1 }],
    [
      '`in` with a scalar value',
      { field: 'general.gate', operator: 'in', value: 'a' },
    ],
    ['`in` with no value', { field: 'general.gate', operator: 'in' }],
    [
      '`in` with an empty array',
      { field: 'general.gate', operator: 'in', value: [] },
    ],
    ['`eq` with no value', { field: 'general.gate', operator: 'eq' }],
    [
      '`eq` with an array value',
      { field: 'general.gate', operator: 'eq', value: [1] },
    ],
  ])(
    'DD-12: rejects a condition with %s (also nested in all/any, and on a subfield)',
    (_name, leaf) => {
      const bad = leaf as never;
      const expected = (path: string) => [
        expect.objectContaining({ rule: 'MALFORMED_CONDITION', path }),
      ];
      expect(
        validateCatalogShape(
          catalog({ fields: [gate(), field({ visible_when: bad })] }),
        ),
      ).toEqual(expected('field:general.title/visible_when'));
      expect(
        validateCatalogShape(
          catalog({
            fields: [
              gate(),
              field({ required_when: { all: [{ any: [bad] }] } }),
            ],
          }),
        ),
      ).toEqual(expected('field:general.title/required_when'));
      expect(
        validateCatalogShape(
          catalog({
            fields: [
              gate(),
              field({
                key: 'general.people',
                type: 'list',
                order: 3,
                subfields: [{ ...subfield, key: 'org', required_when: bad }],
              }),
            ],
          }),
        ),
      ).toEqual(expected('field:general.people/subfield:org/required_when'));
    },
  );

  it('DD-12: rejects `not_null` carrying a value (it takes none)', () => {
    const errors = validateCatalogShape(
      catalog({
        fields: [
          gate(),
          field({
            visible_when: {
              field: 'general.gate',
              operator: 'not_null',
              value: true,
            },
          }),
        ],
      }),
    );
    expect(errors.map((e) => e.rule)).toEqual(['MALFORMED_CONDITION']);
    expect(errors[0].message).toContain('not_null');
  });

  it('DD-12: accepts `not_null` with no value and `in` with a non-empty array (control for the operator check)', () => {
    expect(
      validateCatalogShape(
        catalog({
          fields: [
            gate(),
            field({
              visible_when: { field: 'general.gate', operator: 'not_null' },
              required_when: {
                field: 'result_type',
                operator: 'in',
                value: ['policy_change', 'other_output'],
              },
            }),
          ],
        }),
      ),
    ).toEqual([]);
  });

  it('QAC-R-13: rejects a visible_when naming a key that is not in the catalog (also inside all/any)', () => {
    const errors = validateCatalogShape(
      catalog({
        fields: [
          field({
            visible_when: { all: [{ any: [eq('general.ghost', true)] }] },
          }),
        ],
      }),
    );
    expect(errors).toEqual([
      expect.objectContaining({
        rule: 'UNKNOWN_CONDITION_KEY',
        path: 'field:general.title/visible_when',
      }),
    ]);
    expect(errors[0].message).toContain('general.ghost');
  });

  it('QAC-R-13: rejects a required_when naming an unknown key', () => {
    const errors = validateCatalogShape(
      catalog({ fields: [field({ required_when: eq('general.ghost', 1) })] }),
    );
    expect(errors).toEqual([
      expect.objectContaining({
        rule: 'UNKNOWN_CONDITION_KEY',
        path: 'field:general.title/required_when',
      }),
    ]);
  });

  it('QAC-R-13: rejects a condition key that exists but is not valid in every year the field is valid', () => {
    const errors = validateCatalogShape(
      catalog({
        fields: [
          gate({ valid_from: 2025, valid_to: 2025 }),
          field({
            key: 'general.detail',
            order: 3,
            valid_from: 2026,
            visible_when: eq('general.gate', true),
          }),
          // control: the referenced field covers the referrer's whole range -> accepted
          field({
            key: 'general.covered',
            order: 4,
            valid_from: 2025,
            valid_to: 2025,
            visible_when: eq('general.gate', true),
          }),
        ],
      }),
    );
    expect(errors).toEqual([
      expect.objectContaining({
        rule: 'CONDITION_KEY_NOT_VALID',
        path: 'field:general.detail/visible_when',
      }),
    ]);
  });

  it('QAC-R-13: subfield conditions may name a sibling subfield or a top-level key; an unknown key is rejected', () => {
    const errors = validateCatalogShape(
      catalog({
        fields: [
          gate(),
          field({
            key: 'general.people',
            type: 'list',
            order: 3,
            subfields: [
              { ...subfield, key: 'is_external', type: 'boolean' },
              {
                ...subfield,
                key: 'org',
                visible_when: eq('is_external', true),
                required_when: eq('general.gate', true),
              },
              { ...subfield, key: 'bad', visible_when: eq('ghost', true) },
            ],
          }),
        ],
      }),
    );
    expect(errors).toEqual([
      expect.objectContaining({
        rule: 'UNKNOWN_CONDITION_KEY',
        path: 'field:general.people/subfield:bad/visible_when',
      }),
    ]);
  });

  it('QAC-R-14: accepts subfields nested to depth 2', () => {
    expect(
      validateCatalogShape(
        catalog({
          fields: [
            field({
              key: 'general.programs',
              type: 'list',
              subfields: [
                {
                  ...subfield,
                  key: 'program',
                  type: 'list',
                  subfields: [{ ...subfield, key: 'indicator' }],
                },
              ],
            }),
          ],
        }),
      ),
    ).toEqual([]);
  });

  it('QAC-R-14: rejects depth 3 (a depth-2 subfield that itself has subfields)', () => {
    const errors = validateCatalogShape(
      catalog({
        fields: [
          field({
            key: 'general.programs',
            type: 'list',
            subfields: [
              {
                ...subfield,
                key: 'program',
                type: 'list',
                subfields: [
                  {
                    ...subfield,
                    key: 'mapping',
                    type: 'list',
                    subfields: [{ ...subfield, key: 'too_deep' }],
                  },
                ],
              },
            ],
          }),
        ],
      }),
    );
    expect(errors).toEqual([
      expect.objectContaining({
        rule: 'MAX_DEPTH_EXCEEDED',
        path: 'field:general.programs/subfield:program/subfield:mapping',
      }),
    ]);
  });

  it('QAC-R-1: a nested list/object subfield still needs subfields; a nested select still needs a control_list; sibling keys are unique', () => {
    const errors = validateCatalogShape(
      catalog({
        fields: [
          field({
            key: 'general.programs',
            type: 'list',
            subfields: [
              {
                ...subfield,
                key: 'program',
                type: 'list',
                subfields: [
                  { ...subfield, key: 'pick', type: 'single_select' },
                  { ...subfield, key: 'dup' },
                  { ...subfield, key: 'dup' },
                ],
              },
              { ...subfield, key: 'group', type: 'object' },
            ],
          }),
        ],
      }),
    );
    expect(errors).toEqual([
      expect.objectContaining({
        rule: 'DUPLICATE_KEY',
        path: 'field:general.programs/subfield:program/subfield:dup',
      }),
      expect.objectContaining({
        rule: 'SELECT_WITHOUT_CONTROL_LIST',
        path: 'field:general.programs/subfield:program/subfield:pick',
      }),
      expect.objectContaining({
        rule: 'STRUCTURED_WITHOUT_SUBFIELDS',
        path: 'field:general.programs/subfield:group',
      }),
    ]);
  });

  it('DD-13: rejects two subfields that would persist as the same row (parent_key "<field>.<sub>" collision)', () => {
    const errors = validateCatalogShape(
      catalog({
        fields: [
          field({
            key: 'general.a',
            type: 'list',
            subfields: [
              {
                ...subfield,
                key: 'b',
                type: 'list',
                subfields: [{ ...subfield, key: 'c' }],
              },
            ],
          }),
          field({
            key: 'general.a.b',
            type: 'list',
            order: 2,
            subfields: [{ ...subfield, key: 'c' }],
          }),
        ],
      }),
    );
    expect(errors).toEqual([
      expect.objectContaining({
        rule: 'DUPLICATE_KEY',
        path: 'field:general.a.b/subfield:c',
      }),
    ]);
  });

  const pathStep = {
    table: 'child',
    join: [{ from: 'id', to: 'parent_id' }],
  };
  const withPath = (storage: unknown, asSub = false) =>
    asSub
      ? catalog({
          fields: [
            field({
              key: 'general.group',
              type: 'list',
              subfields: [{ ...subfield, storage: storage as never }],
            }),
          ],
        })
      : catalog({ fields: [field({ storage: storage as never })] });

  it('QAC-R-14: accepts a well-formed path binding on a field and on a subfield', () => {
    const ok = {
      kind: 'path',
      steps: [
        pathStep,
        {
          ...pathStep,
          join: [
            { from: 'id', to: 'parent_id' },
            { from: 'result_id', to: 'results_id' },
          ],
          filter: { is_active: 1 },
        },
      ],
      value_column: 'value',
      columns: ['extra'],
    };
    expect(validateCatalogShape(withPath(ok))).toEqual([]);
    expect(validateCatalogShape(withPath(ok, true))).toEqual([]);
  });

  it.each([
    ['no steps', { kind: 'path', steps: [], value_column: 'v' }],
    [
      'a step without a table',
      {
        kind: 'path',
        steps: [{ ...pathStep, table: '' }],
        value_column: 'v',
      },
    ],
    [
      'a step without join',
      { kind: 'path', steps: [{ table: 't' }], value_column: 'v' },
    ],
    [
      'a step with an empty join',
      {
        kind: 'path',
        steps: [{ table: 't', join: [] }],
        value_column: 'v',
      },
    ],
    [
      'a join pair without `to`',
      {
        kind: 'path',
        steps: [{ table: 't', join: [{ from: 'id' }] }],
        value_column: 'v',
      },
    ],
    [
      'a blank second join pair',
      {
        kind: 'path',
        steps: [
          {
            table: 't',
            join: [
              { from: 'id', to: 'x' },
              { from: ' ', to: 'y' },
            ],
          },
        ],
        value_column: 'v',
      },
    ],
    [
      'the legacy single-pair join_from / join_to',
      {
        kind: 'path',
        steps: [{ table: 't', join_from: 'id', join_to: 'x' }],
        value_column: 'v',
      },
    ],
    ['no value_column', { kind: 'path', steps: [pathStep] }],
  ])('QAC-R-14: rejects a malformed path binding (%s)', (_name, storage) => {
    const errors = validateCatalogShape(withPath(storage));
    expect(errors).toEqual([
      expect.objectContaining({
        rule: 'MALFORMED_PATH_BINDING',
        path: 'field:general.title',
      }),
    ]);
    expect(
      validateCatalogShape(withPath(storage, true)).map((e) => e.rule),
    ).toEqual(['MALFORMED_PATH_BINDING']);
  });

  it('QAC-R-14: accepts a lookup binding; rejects one missing source, keys or value_column', () => {
    // each key `from` must name a real key: a top-level key (a subfield may not name itself)
    const ok = (asSub: boolean) => ({
      kind: 'lookup',
      source: 'toc_hlo',
      keys: [{ from: asSub ? 'general.group' : 'general.title', to: 'id' }],
      value_column: 'statement',
    });
    expect(validateCatalogShape(withPath(ok(false)))).toEqual([]);
    expect(validateCatalogShape(withPath(ok(true), true))).toEqual([]);
    for (const missing of ['source', 'keys', 'value_column']) {
      const blank = missing === 'keys' ? [] : '';
      const bad = (asSub: boolean) => ({ ...ok(asSub), [missing]: blank });
      expect(validateCatalogShape(withPath(bad(false)))).toEqual([
        expect.objectContaining({
          rule: 'MALFORMED_LOOKUP_BINDING',
          path: 'field:general.title',
        }),
      ]);
      expect(
        validateCatalogShape(withPath(bad(true), true)).map((e) => e.rule),
      ).toEqual(['MALFORMED_LOOKUP_BINDING']);
    }
  });

  it('QAC-R-14: a lookup accepts alternative keys and qualifiers (literal or phase_year); rejects malformed ones', () => {
    const base = {
      kind: 'lookup',
      source: 'toc_target',
      value_column: 'target_value',
    };
    const good = {
      ...base,
      keys: [
        { from: 'general.title', to: 'toc_result_indicator_id' },
        { from: 'general.title', to: 'id_indicator' },
      ],
      qualifiers: [
        { column: 'target_date', equals: 'phase_year', match: 'year' },
        { column: 'is_active', equals: 1, match: 'equals' },
      ],
      pick: { order_by: 'target_date', direction: 'desc' },
    };
    expect(validateCatalogShape(withPath(good))).toEqual([]);
    const k = good.keys;
    for (const [name, bad] of [
      ['a key without `to`', { ...good, keys: [{ from: 'general.title' }] }],
      ['a blank key `from`', { ...good, keys: [{ from: '', to: 'id' }] }],
      [
        'a second key blank',
        { ...good, keys: [k[0], { from: 'general.title', to: '' }] },
      ],
      ['the legacy key_from', { ...base, key_from: 'general.title' }],
      [
        'qualifiers not an array',
        { ...good, qualifiers: { column: 'a', equals: 1 } },
      ],
      ['a qualifier without column', { ...good, qualifiers: [{ equals: 1 }] }],
      [
        'a qualifier without equals',
        { ...good, qualifiers: [{ column: 'target_date' }] },
      ],
      [
        'a qualifier with an object equals',
        { ...good, qualifiers: [{ column: 'a', equals: {} }] },
      ],
      [
        'a qualifier with an unknown match',
        { ...good, qualifiers: [{ column: 'a', equals: 1, match: 'month' }] },
      ],
      ['a pick without order_by', { ...good, pick: { direction: 'desc' } }],
      [
        'a pick with a blank order_by',
        { ...good, pick: { order_by: ' ', direction: 'desc' } },
      ],
      [
        'a pick with an unknown direction',
        { ...good, pick: { order_by: 'target_date', direction: 'up' } },
      ],
      ['a pick that is not an object', { ...good, pick: 'target_date' }],
    ] as [string, unknown][]) {
      expect({
        name,
        rules: validateCatalogShape(withPath(bad)).map((e) => e.rule),
      }).toEqual({ name, rules: ['MALFORMED_LOOKUP_BINDING'] });
    }
  });
});

describe('validateCatalogShape: lookup key_from (DD-13)', () => {
  const lookup = (from: string, ...alternatives: string[]) => ({
    kind: 'lookup' as const,
    source: 'toc_hlo',
    keys: [from, ...alternatives].map((f) => ({ from: f, to: 'id' })),
    value_column: 'statement',
  });
  const holder = (over: Partial<CatalogField>): CatalogDefinition =>
    catalog({
      fields: [
        field({
          key: 'general.programs',
          type: 'list',
          subfields: [
            { ...subfield, key: 'hlo_id', type: 'number' },
            { ...subfield, key: 'hlo', storage: lookup('hlo_id') },
          ],
        }),
        field({ key: 'general.anchor_id', order: 2, type: 'number' }),
        field({ key: 'general.hlo', order: 3, ...over }),
      ],
    });

  it('accepts key_from naming a sibling subfield key, or a top-level key', () => {
    expect(
      validateCatalogShape(holder({ storage: lookup('general.anchor_id') })),
    ).toEqual([]);
  });

  it('rejects key_from naming neither a sibling subfield nor a top-level key (subfield and top-level lookups)', () => {
    const errors = validateCatalogShape(
      catalog({
        fields: [
          field({
            key: 'general.programs',
            type: 'list',
            subfields: [
              { ...subfield, key: 'hlo', storage: lookup('ghost_id') },
            ],
          }),
          field({ key: 'general.hlo', order: 2, storage: lookup('ghost_id') }),
        ],
      }),
    );
    expect(errors).toEqual([
      expect.objectContaining({
        rule: 'UNKNOWN_LOOKUP_KEY',
        path: 'field:general.programs/subfield:hlo',
      }),
      expect.objectContaining({
        rule: 'UNKNOWN_LOOKUP_KEY',
        path: 'field:general.hlo',
      }),
    ]);
    expect(errors[0].message).toContain('ghost_id');
  });

  it('rejects a subfield lookup whose key_from names the subfield itself, even when a top-level key has that name', () => {
    const errors = validateCatalogShape(
      catalog({
        fields: [
          field({
            key: 'general.programs',
            type: 'list',
            subfields: [
              { ...subfield, key: 'hlo', storage: lookup('hlo') },
              { ...subfield, key: 'other', storage: lookup('hlo') },
            ],
          }),
        ],
      }),
    );
    expect(errors).toEqual([
      expect.objectContaining({
        rule: 'UNKNOWN_LOOKUP_KEY',
        path: 'field:general.programs/subfield:hlo',
      }),
    ]);
    expect(errors[0].message).toContain('itself');
  });

  it('every alternative key `from` is checked, not only the first', () => {
    const errors = validateCatalogShape(
      holder({ storage: lookup('general.anchor_id', 'ghost_id') }),
    );
    expect(errors.map((e) => e.rule)).toEqual(['UNKNOWN_LOOKUP_KEY']);
    expect(errors[0].message).toContain('ghost_id');
  });

  it('a sibling key is not enough for a top-level lookup (siblings only exist among subfields)', () => {
    const errors = validateCatalogShape(holder({ storage: lookup('hlo_id') }));
    expect(errors.map((e) => e.rule)).toEqual(['UNKNOWN_LOOKUP_KEY']);
  });
});

describe('isValidIn (QAC-R-3)', () => {
  it.each([
    [{ valid_from: 2025, valid_to: 2025 }, 2024, false],
    [{ valid_from: 2025, valid_to: 2025 }, 2025, true],
    [{ valid_from: 2025, valid_to: 2025 }, 2026, false],
    [{ valid_from: 2026, valid_to: null }, 2025, false],
    [{ valid_from: 2026, valid_to: null }, 2026, true],
    [{ valid_from: 2026, valid_to: null }, 2099, true],
  ])('%j in %d -> %s', (entry, year, expected) => {
    expect(isValidIn(entry, year)).toBe(expected);
  });
});

describe('the real catalog definitions', () => {
  it('validate with zero shape errors', () => {
    expect(
      validateCatalogShape({
        resultTypes: CATALOG_RESULT_TYPES,
        sections: CATALOG_SECTIONS,
        fields: CATALOG_FIELDS,
        notForQa: NOT_FOR_QA,
      }),
    ).toEqual([]);
  });

  it('declares the nine result types and the 2026 version', () => {
    expect(CATALOG_RESULT_TYPES.map((t) => t.key).sort()).toEqual([
      'capacity_sharing',
      'impact_contribution',
      'innovation_development',
      'innovation_package',
      'innovation_use',
      'knowledge_product',
      'other_outcome',
      'other_output',
      'policy_change',
    ]);
    expect(CATALOG_VERSIONS[2026]).toEqual({ portfolio: 'P25', revision: 12 });
  });

  it('2026-10-06 amendment: no `toc_alignment` / `linked_results` section exists; every `toc.*` and `linked.*` field lives in `contributors_partners` (one client page)', () => {
    expect(CATALOG_SECTIONS.map((x) => x.key)).not.toContain('toc_alignment');
    expect(CATALOG_SECTIONS.map((x) => x.key)).not.toContain('linked_results');
    for (const key of ['linked.has_innovation_link', 'linked.results']) {
      expect(CATALOG_FIELDS.find((f) => f.key === key)?.section).toBe(
        'contributors_partners',
      );
    }
    const toc = CATALOG_FIELDS.filter((f) => f.key.startsWith('toc.'));
    expect(toc.length).toBeGreaterThan(0);
    expect(toc.map((f) => f.section)).toEqual(
      toc.map(() => 'contributors_partners'),
    );
    expect(
      CATALOG_FIELDS.some((f) =>
        ['toc_alignment', 'linked_results'].includes(f.section),
      ),
    ).toBe(false);
    const merged = CATALOG_FIELDS.filter(
      (f) => f.section === 'contributors_partners',
    );
    expect(new Set(merged.map((f) => f.order)).size).toBe(merged.length);
  });

  it('2026-10-07 amendment: `contributors.bilateral_projects` is a plain multi_select of `projects` bound to results_by_projects, in contributors_partners, for every result type', () => {
    const f = CATALOG_FIELDS.find(
      (x) => x.key === 'contributors.bilateral_projects',
    );
    expect(f).toBeDefined();
    expect(f?.section).toBe('contributors_partners');
    expect(f?.type).toBe('multi_select');
    expect(f?.control_list).toBe('projects');
    expect(f?.label).toBe('Contributing W3 and/or bilateral projects');
    expect(f?.required).toBe(false);
    expect(f?.required_confirmed).toBe(false);
    expect(f?.result_types).toEqual(['*']);
    expect(f?.subfields).toBeUndefined();
    expect(f?.storage).toEqual({
      kind: 'relation',
      table: 'results_by_projects',
      fk_to_result: 'result_id',
      value_column: 'project_id',
      filter: { is_active: 1 },
    });
  });

  it('2026-10-06 amendment: the result envelope fields are catalogued in general_information for every result type', () => {
    const expected: Record<string, string> = {
      'general.result_code': 'result_code',
      'general.result_type': 'result_type_id',
      'general.result_level': 'result_level_id',
      'general.created_by': 'created_by',
      'general.created_date': 'created_date',
      'general.status': 'status_id',
    };
    for (const [key, column] of Object.entries(expected)) {
      const field = CATALOG_FIELDS.find((f) => f.key === key);
      expect(field).toBeDefined();
      expect(field?.section).toBe('general_information');
      expect(field?.result_types).toEqual(['*']);
      expect(field?.required_confirmed).toBe(false);
      expect(field?.storage).toEqual({
        kind: 'column',
        table: 'result',
        column,
      });
    }
    const gi = CATALOG_FIELDS.filter(
      (f) => f.section === 'general_information',
    );
    expect(gi.map((f) => f.key)).toEqual(
      expect.arrayContaining(Object.keys(expected)),
    );
    expect(new Set(gi.map((f) => f.order)).size).toBe(gi.length);
  });

  it('2026-10-07 amendment (v1.4): `contributors.submitter` is "Submitter" first in contributors_partners; `general.primary_program` mirrors it in general_information; both orders are contiguous', () => {
    const find = (k: string) => CATALOG_FIELDS.find((f) => f.key === k);
    const submitter = find('contributors.submitter');
    const primary = find('general.primary_program');
    expect(submitter?.section).toBe('contributors_partners');
    expect(submitter?.label).toBe('Submitter');
    expect(submitter?.order).toBe(1);
    expect(primary?.section).toBe('general_information');
    expect(primary?.label).toBe('Primary Program');
    expect(primary?.order).toBe(3);
    for (const f of [submitter, primary]) {
      expect(f?.control_list).toBe('initiatives');
      expect(f?.type).toBe('single_select');
    }
    expect(primary?.storage).toEqual(submitter?.storage);
    expect(primary?.required).toBe(submitter?.required);
    expect(primary?.required_confirmed).toBe(submitter?.required_confirmed);
    const sorted = (section: string) =>
      CATALOG_FIELDS.filter((f) => f.section === section).sort(
        (a, b) => a.order - b.order,
      );
    const gi = sorted('general_information');
    expect(gi.map((f) => f.key)).toEqual([
      'general.result_level',
      'general.result_type',
      'general.primary_program',
      'general.title',
      'general.description',
      'general.lead_contact_person',
      'general.gender_tag',
      'general.gender_impact_areas',
      'general.climate_tag',
      'general.climate_impact_areas',
      'general.nutrition_tag',
      'general.nutrition_impact_areas',
      'general.environment_tag',
      'general.environment_impact_areas',
      'general.poverty_tag',
      'general.poverty_impact_areas',
      'general.result_code',
      'general.created_by',
      'general.created_date',
      'general.status',
      'general.is_discontinued',
      'general.discontinued_reasons',
      'general.merge_targets',
      'general.split_targets',
      'general.is_replicated',
    ]);
    expect(gi.map((f) => f.order)).toEqual(gi.map((_, i) => i + 1));
    const cp = sorted('contributors_partners');
    expect(cp.map((f) => f.order)).toEqual(cp.map((_, i) => i + 1));
    expect(cp[0].key).toBe('contributors.submitter');
  });

  it('DD-12 (T-14 review): `general.is_replicated` is a catalogued boolean on result.is_replicated for the innovation types; no condition names the bare column; it is no longer NOT_FOR_QA', () => {
    const f = CATALOG_FIELDS.find((x) => x.key === 'general.is_replicated');
    expect(f).toBeDefined();
    expect(f?.section).toBe('general_information');
    expect(f?.type).toBe('boolean');
    expect(f?.label).toBe('Is this a replicated innovation?');
    expect(f?.result_types).toEqual([
      'innovation_development',
      'innovation_use',
    ]);
    expect(f?.required).toBe(false);
    expect(f?.required_confirmed).toBe(false);
    expect(f?.storage).toEqual({
      kind: 'column',
      table: 'result',
      column: 'is_replicated',
    });
    expect(
      NOT_FOR_QA.some(
        (n) => n.table === 'result' && n.column === 'is_replicated',
      ),
    ).toBe(false);
    const conditionKeys = (c: unknown): string[] => {
      const o = c as Record<string, unknown>;
      if (!o) return [];
      if (Array.isArray(o.all)) return o.all.flatMap(conditionKeys);
      if (Array.isArray(o.any)) return o.any.flatMap(conditionKeys);
      return [o.field as string];
    };
    const used = CATALOG_FIELDS.flatMap((x) => [
      ...conditionKeys(x.required_when),
      ...conditionKeys(x.visible_when),
    ]);
    expect(used).not.toContain('is_replicated');
    // the discontinued-reasons rule (ANNUAL_UPDATING_ACTIVE) and the is_discontinued rule
    expect(used.filter((k) => k === 'general.is_replicated')).toHaveLength(2);
  });

  it('QAC-R-5: the IPSR step-1 geography is unconfirmed and optional (the live step-1 function does not test it), and innovation_package carries no common geo.* key', () => {
    const byKey = (k: string) => CATALOG_FIELDS.find((f) => f.key === k);
    for (const key of [
      'ipsr_step_1.geo_scope',
      'ipsr_step_1.regions',
      'ipsr_step_1.countries',
    ]) {
      const field = byKey(key);
      expect(field).toBeDefined();
      expect(field.result_types).toEqual(['innovation_package']);
      expect(field.required).toBe(false);
      expect(field.required_confirmed).toBe(false);
    }
    // The IPSR step-1 writer leaves result_region/result_country.geo_scope_role_id NULL: a role filter finds nothing.
    for (const key of ['ipsr_step_1.regions', 'ipsr_step_1.countries']) {
      const storage = byKey(key).storage as {
        filter?: Record<string, unknown>;
      };
      expect(storage.filter).toEqual({ is_active: 1 });
      expect(storage.filter).not.toHaveProperty('geo_scope_role_id');
    }
    const geoSection = CATALOG_SECTIONS.find(
      (s) => s.key === 'geographic_location',
    );
    const commonGeo = CATALOG_FIELDS.filter((f) => f.key.startsWith('geo.'));
    expect(commonGeo.length).toBeGreaterThan(0);
    for (const f of [geoSection, ...commonGeo]) {
      expect(f.result_types).not.toContain('*');
      expect(f.result_types).not.toContain('innovation_package');
    }
  });
});
