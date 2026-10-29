// @akili-spec quality-assurance/qa-field-catalog
import { CATALOG_FIELDS, CATALOG_SECTIONS } from './definitions/sections';
import { CATALOG_RESULT_TYPES } from './definitions/result-types';
import { CLOSED_CONTROL_LISTS } from './definitions/closed-control-lists';
import { NOT_FOR_QA } from './definitions/not-for-qa';
import { PENDING_CATALOG } from './definitions/pending-catalog';
import { validateCatalogShape } from './definitions/shape-validator';
import {
  CatalogField,
  CatalogSubField,
  Condition,
  PathBinding,
} from './definitions/types';

/**
 * QAC-T-29: IPSR step 2 (2.1 bundle + modal, 2.2 enabler types). Expected values come from the 2026 form
 * (new-complementary-innovation.component.html, step-two-basic-info.component.html), the writer
 * (innovation-pathway-step-two.service.ts, results-innovation-packages-enabler-type.repository.ts) and the live functions
 * validation_ipsr_step_two_one_P25 / _two_two_P25 (tmp/, identical: >= 1 active role-2 element), not from the catalog under test.
 * `assertIpsrStep2` is the assertion function; the falsifiers run it on a MUTATED copy of the real catalog.
 */
const BUNDLE = 'ipsr_step_2_1.complementary_innovations';
const ENABLERS = 'ipsr_step_2_2.enabler_elements';
const IS_CHILD: Condition = { field: 'result_type', operator: 'eq', value: 11 };

const get = (fields: CatalogField[], key: string): CatalogField => {
  const f = fields.find((x) => x.key === key);
  if (!f) throw new Error(`missing field ${key}`);
  return f;
};
const sub = (f: CatalogField, key: string): CatalogSubField => {
  const s = f.subfields?.find((x) => x.key === key);
  if (!s) throw new Error(`missing subfield ${f.key}/${key}`);
  return s;
};

interface SubExpect {
  type: CatalogSubField['type'];
  required?: boolean;
  required_when?: Condition;
  visible_when?: Condition;
  table: string; // first step table (path) or the column's table
  column: string;
}

// Modal rules: short title / long title / "aware of projects" required, only for the modal-created child (result type 11).
const BUNDLE_SUBS: Array<[string, SubExpect]> = [
  [
    'result',
    {
      type: 'single_select',
      required: true,
      table: 'result_by_innovation_package',
      column: 'result_id',
    },
  ],
  [
    'result_type',
    { type: 'single_select', table: 'result', column: 'result_type_id' },
  ],
  [
    'short_title',
    {
      type: 'text',
      required_when: IS_CHILD,
      visible_when: IS_CHILD,
      table: 'results_complementary_innovation',
      column: 'short_title',
    },
  ],
  [
    'title',
    {
      type: 'text',
      required_when: IS_CHILD,
      visible_when: IS_CHILD,
      table: 'result',
      column: 'title',
    },
  ],
  [
    'description',
    {
      type: 'text',
      visible_when: IS_CHILD,
      table: 'result',
      column: 'description',
    },
  ],
  [
    'functions',
    {
      type: 'multi_select',
      visible_when: IS_CHILD,
      table: 'results_complementary_innovation',
      column: 'complementary_innovation_function_id',
    },
  ],
  [
    'other_functions',
    {
      type: 'text',
      visible_when: IS_CHILD,
      table: 'results_complementary_innovation',
      column: 'other_funcions',
    },
  ],
  [
    'projects_organizations_working_on_innovation',
    {
      type: 'boolean',
      required_when: IS_CHILD,
      visible_when: IS_CHILD,
      table: 'results_complementary_innovation',
      column: 'projects_organizations_working_on_innovation',
    },
  ],
  [
    'specify_projects_organizations',
    {
      type: 'text',
      visible_when: {
        all: [
          IS_CHILD,
          {
            field: 'projects_organizations_working_on_innovation',
            operator: 'eq',
            value: true,
          },
        ],
      },
      table: 'results_complementary_innovation',
      column: 'specify_projects_organizations',
    },
  ],
];

const firstTable = (s: CatalogSubField): string =>
  s.storage.kind === 'path'
    ? s.storage.steps[0].table
    : s.storage.kind === 'column'
      ? s.storage.table
      : '';

function checkSubs(
  parent: CatalogField,
  expected: Array<[string, SubExpect]>,
): void {
  expect(parent.subfields?.map((s) => s.key)).toEqual(expected.map(([k]) => k));
  for (const [key, e] of expected) {
    const s = sub(parent, key);
    const fail = (what: string) => {
      throw new Error(`${parent.key}/${key}: ${what}`);
    };
    if (s.type !== e.type) fail('type');
    if ((s.required ?? false) !== (e.required ?? false)) fail('required');
    if (JSON.stringify(s.required_when) !== JSON.stringify(e.required_when))
      fail('required_when');
    if (JSON.stringify(s.visible_when) !== JSON.stringify(e.visible_when))
      fail('visible_when');
    if (firstTable(s) !== e.table) fail('table');
    const value =
      s.storage.kind === 'path'
        ? s.storage.value_column
        : s.storage.kind === 'column'
          ? s.storage.column
          : '';
    // a path's value lives on the LAST step; the expectation names its table through `column` for the multi-step cases
    if (s.storage.kind === 'column' && value !== e.column) fail('column');
    if (s.storage.kind === 'path' && value !== e.column) fail('value_column');
  }
}

/** Assertion function: throws on the first rule the real catalog must satisfy. */
function assertIpsrStep2(fields: CatalogField[]): void {
  const bundle = get(fields, BUNDLE);
  // VS21:7-27 states >= 1 role-2 element: required AND confirmed. A list, because it carries subfields (a multi_select cannot).
  if (bundle.type !== 'list') throw new Error('bundle must be a list');
  if (!bundle.required || !bundle.required_confirmed)
    throw new Error('bundle: required and confirmed (VS21)');
  const rel = bundle.storage as any;
  if (
    rel.kind !== 'relation' ||
    rel.table !== 'result_by_innovation_package' ||
    rel.fk_to_result !== 'result_innovation_package_id' ||
    rel.value_column !== 'result_id' ||
    JSON.stringify(rel.filter) !==
      JSON.stringify({ ipsr_role_id: 2, is_active: 1 })
  )
    throw new Error('bundle: relation binding is wrong');
  checkSubs(bundle, BUNDLE_SUBS);

  // functions: element -> its complementary row (active) -> its function rows (active) -> function id
  const fn = sub(bundle, 'functions').storage as PathBinding;
  if (
    fn.kind !== 'path' ||
    fn.steps.length !== 2 ||
    fn.steps[0].table !== 'results_complementary_innovation' ||
    JSON.stringify(fn.steps[0].join) !==
      JSON.stringify([{ from: 'result_id', to: 'result_id' }]) ||
    fn.steps[1].table !== 'results_complementary_innovations_function' ||
    JSON.stringify(fn.steps[1].filter) !== JSON.stringify({ is_active: 1 }) ||
    fn.value_column !== 'complementary_innovation_function_id'
  )
    throw new Error('functions binding is wrong');
  // title / description are the child RESULT's columns (result_id -> id), type is the element's result type
  for (const k of ['title', 'description', 'result_type']) {
    const b = sub(bundle, k).storage as PathBinding;
    if (
      b.steps.length !== 1 ||
      JSON.stringify(b.steps[0].join) !==
        JSON.stringify([{ from: 'result_id', to: 'id' }])
    )
      throw new Error(`${k}: must read the element's result (result_id -> id)`);
  }
  // the modal's table row is only the active one
  for (const k of [
    'short_title',
    'other_functions',
    'projects_organizations_working_on_innovation',
    'specify_projects_organizations',
  ]) {
    const b = sub(bundle, k).storage as PathBinding;
    if (JSON.stringify(b.steps[0].filter) !== JSON.stringify({ is_active: 1 }))
      throw new Error(`${k}: must filter the complementary row by is_active`);
  }
  // "function OR other functions" is an any-of: neither may be unconditionally required
  for (const k of ['functions', 'other_functions']) {
    const s = sub(bundle, k);
    if (s.required || s.required_when)
      throw new Error(`${k}: the form rule is an any-of, not expressible`);
  }

  // step 2.2: same elements, enabler types split by level through the referenced type
  const en = get(fields, ENABLERS);
  if (en.type !== 'list') throw new Error('enabler_elements must be a list');
  if (!en.required || !en.required_confirmed)
    throw new Error('enabler_elements: VS22 states >= 1 element');
  if (JSON.stringify(en.storage) !== JSON.stringify(bundle.storage))
    throw new Error('enabler_elements: same elements as 2.1');
  expect(en.subfields?.map((s) => s.key)).toEqual([
    'result',
    'enabler_type_level_1',
    'enabler_type_level_2',
  ]);
  for (const [key, level] of [
    ['enabler_type_level_1', 1],
    ['enabler_type_level_2', 2],
  ] as const) {
    const s = sub(en, key);
    if (s.required || s.required_when || s.visible_when)
      throw new Error(`${key}: the picker is [required]=false`);
    if (
      s.type !== 'multi_select' ||
      s.control_list !== 'complementary_innovation_enabler_types'
    )
      throw new Error(`${key}: type / list`);
    const p = s.storage as PathBinding;
    if (
      p.kind !== 'path' ||
      p.steps.length !== 2 ||
      p.steps[0].table !== 'results_innovatio_packages_enabler_type' ||
      JSON.stringify(p.steps[0].join) !==
        JSON.stringify([
          {
            from: 'result_by_innovation_package_id',
            to: 'result_by_innovation_package_id',
          },
        ]) ||
      JSON.stringify(p.steps[0].filter) !== JSON.stringify({ is_active: 1 }) ||
      p.steps[1].table !== 'complementary_innovation_enabler_types' ||
      JSON.stringify(p.steps[1].filter) !== JSON.stringify({ level }) ||
      p.value_column !== 'complementary_innovation_enabler_types_id'
    )
      throw new Error(`${key}: binding / level ${level} is wrong`);
  }
}

describe('QAC-T-29 IPSR step 2', () => {
  it('the real catalog satisfies the IPSR step-2 rules', () => {
    expect(() => assertIpsrStep2(CATALOG_FIELDS)).not.toThrow();
  });

  it('keeps the shape valid (list with subfields, path bindings, conditions on sibling subfields)', () => {
    const errors = validateCatalogShape({
      resultTypes: CATALOG_RESULT_TYPES,
      sections: CATALOG_SECTIONS,
      fields: CATALOG_FIELDS,
      notForQa: NOT_FOR_QA,
      pendingCatalog: PENDING_CATALOG,
    } as any);
    expect(errors).toEqual([]);
  });

  it('keeps the frozen key and adds the planned keys verbatim (inventory 2026-B 3.5-3.6)', () => {
    const keys = CATALOG_FIELDS.map((f) => f.key);
    expect(keys).toContain(BUNDLE);
    expect(keys).toContain(ENABLERS);
  });

  it('the new 2.2 section exists, is the only one of its key and sits between 2.1 and step 3', () => {
    const order = (k: string) =>
      CATALOG_SECTIONS.find((s) => s.key === k)?.order as number;
    expect(order('ipsr_s21_bundle')).toBeLessThan(order('ipsr_s22_basic_info'));
    expect(order('ipsr_s22_basic_info')).toBeLessThan(
      order('ipsr_s3_workshop'),
    );
    expect(get(CATALOG_FIELDS, ENABLERS).section).toBe('ipsr_s22_basic_info');
  });

  it('result_type 11 is in the closed result_types list the conditions are checked against', () => {
    expect(CLOSED_CONTROL_LISTS.result_types).toContain(11);
  });

  it('no step 2 column is PENDING_CATALOG any more', () => {
    for (const t of [
      'results_complementary_innovation',
      'results_complementary_innovations_function',
      'results_innovatio_packages_enabler_type',
    ]) {
      expect(PENDING_CATALOG.filter((e) => e.table === t)).toEqual([]);
    }
  });

  it('the enabler-types reference table only keeps its audit, label and tree columns NOT_FOR_QA (id and level are bound)', () => {
    const cols = NOT_FOR_QA.filter(
      (e) => e.table === 'complementary_innovation_enabler_types',
    ).map((e) => e.column);
    expect(cols.sort()).toEqual(
      [
        'created_by',
        'created_date',
        'group',
        'is_active',
        'last_updated_by',
        'last_updated_date',
        'type',
      ].sort(),
    );
    expect(cols).not.toContain('level');
    expect(cols).not.toContain('complementary_innovation_enabler_types_id');
  });

  describe('falsifiers (assertion function on a mutated copy of the real catalog)', () => {
    const mutate = (
      key: string,
      edit: (f: CatalogField) => Partial<CatalogField>,
    ): CatalogField[] =>
      CATALOG_FIELDS.map((f) => (f.key === key ? { ...f, ...edit(f) } : f));
    const mutateSub = (
      parent: string,
      subKey: string,
      edit: (s: CatalogSubField) => Partial<CatalogSubField>,
    ): CatalogField[] =>
      mutate(parent, (f) => ({
        subfields: f.subfields?.map((s) =>
          s.key === subKey ? { ...s, ...edit(s) } : s,
        ),
      }));

    it('reverting the bundle to a multi_select is detected', () => {
      expect(() =>
        assertIpsrStep2(mutate(BUNDLE, () => ({ type: 'multi_select' }))),
      ).toThrow(/list/);
    });

    it('also: the production shape validator rejects a multi_select that carries subfields', () => {
      const errors = validateCatalogShape({
        resultTypes: CATALOG_RESULT_TYPES,
        sections: CATALOG_SECTIONS,
        fields: mutate(BUNDLE, () => ({
          type: 'multi_select',
          control_list: 'ipsr_bundle_candidates',
        })),
        notForQa: NOT_FOR_QA,
        pendingCatalog: PENDING_CATALOG,
      } as any);
      expect(errors.map((e) => e.rule)).toContain(
        'MULTI_SELECT_WITH_SUBFIELDS',
      );
    });

    it('requiring the short title of table-picked elements too (dropping the type-11 gate) is detected', () => {
      expect(() =>
        assertIpsrStep2(
          mutateSub(BUNDLE, 'short_title', () => ({
            required_when: undefined,
            visible_when: undefined,
            required: true,
          })),
        ),
      ).toThrow(/short_title/);
    });

    it('making the aware-of-projects answer optional is detected', () => {
      expect(() =>
        assertIpsrStep2(
          mutateSub(
            BUNDLE,
            'projects_organizations_working_on_innovation',
            () => ({
              required_when: undefined,
            }),
          ),
        ),
      ).toThrow(/required_when/);
    });

    it('the specify text shown for any answer (dropping the Yes gate) is detected', () => {
      expect(() =>
        assertIpsrStep2(
          mutateSub(BUNDLE, 'specify_projects_organizations', () => ({
            visible_when: IS_CHILD,
          })),
        ),
      ).toThrow(/visible_when/);
    });

    it('forcing functions to be required (the real rule is function OR other) is detected', () => {
      expect(() =>
        assertIpsrStep2(
          mutateSub(BUNDLE, 'functions', () => ({ required: true })),
        ),
      ).toThrow(/functions/);
    });

    it('a function binding that forgets the is_active filter is detected', () => {
      expect(() =>
        assertIpsrStep2(
          mutateSub(BUNDLE, 'functions', (s) => ({
            storage: {
              ...(s.storage as PathBinding),
              steps: (s.storage as PathBinding).steps.map((st, i) =>
                i === 1 ? { ...st, filter: undefined } : st,
              ),
            },
          })),
        ),
      ).toThrow(/functions binding/);
    });

    it('a title read from the wrong join (not the element result) is detected', () => {
      expect(() =>
        assertIpsrStep2(
          mutateSub(BUNDLE, 'title', (s) => ({
            storage: {
              ...(s.storage as PathBinding),
              steps: (s.storage as PathBinding).steps.map((st) => ({
                ...st,
                join: [{ from: 'result_innovation_package_id', to: 'id' }],
              })),
            },
          })),
        ),
      ).toThrow(/title/);
    });

    it('the bundle losing the role-2 filter is detected', () => {
      expect(() =>
        assertIpsrStep2(
          mutate(BUNDLE, (f) => ({
            storage: { ...(f.storage as any), filter: { is_active: 1 } },
          })),
        ),
      ).toThrow(/relation binding/);
    });

    it('both enabler-type levels reading the same rows (level filter dropped) is detected', () => {
      expect(() =>
        assertIpsrStep2(
          mutateSub(ENABLERS, 'enabler_type_level_2', (s) => ({
            storage: {
              ...(s.storage as PathBinding),
              steps: (s.storage as PathBinding).steps.map((st, i) =>
                i === 1 ? { ...st, filter: { level: 1 } } : st,
              ),
            },
          })),
        ),
      ).toThrow(/level 2/);
    });

    it('requiring the enabler types (the form marks them optional) is detected', () => {
      expect(() =>
        assertIpsrStep2(
          mutateSub(ENABLERS, 'enabler_type_level_1', () => ({
            required: true,
          })),
        ),
      ).toThrow(/required/);
    });

    it('dropping the 2.2 element requirement (VS22 states it) is detected', () => {
      expect(() =>
        assertIpsrStep2(mutate(ENABLERS, () => ({ required: false }))),
      ).toThrow(/VS22/);
    });
  });
});
