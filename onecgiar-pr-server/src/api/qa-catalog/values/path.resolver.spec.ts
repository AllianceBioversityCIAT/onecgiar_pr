// @akili-spec quality-assurance/qa-results-feed
// QRF-DD-6 / QRF-DD-7 / QRF-R-7 for `path` bindings: join pairs, step filter, pick, subfield start row, grouping.
import { CatalogField, CatalogSubField } from '../definitions/types';
import { FixtureDb, fixtureRunner } from './fixtures';
import { resolvePathFields } from './path.resolver';
import { TableKeys } from './table-metadata';

const PKS: Record<string, string> = {
  fx_result: 'id',
  fx_budget: 'budget_row_id',
  fx_file: 'file_row_id',
  fx_parent: 'parent_row_id',
  fx_child: 'child_row_id',
};
const keys: TableKeys = {
  primaryKey: (t) => PKS[t],
  resultKey: () => 'id',
  temporal: () => 'datetime',
};
const ctx = (db: FixtureDb) => ({
  run: fixtureRunner(db),
  keys,
  resultTable: 'fx_result',
});

const base = {
  section: 'fx',
  order: 1,
  result_types: ['*'],
  required: false,
  required_confirmed: false,
  valid_from: 2026,
  valid_to: null,
};
const pathField = (
  key: string,
  type: CatalogField['type'],
  steps: Extract<CatalogField['storage'], { kind: 'path' }>['steps'],
  value_column: string,
  subfields?: CatalogSubField[],
): CatalogField => ({
  ...base,
  key,
  label: key,
  type,
  storage: { kind: 'path', steps, value_column },
  ...(subfields ? { subfields } : {}),
});

const DB: FixtureDb = {
  fx_result: [
    { id: 1, initiative_id: 5 },
    { id: 2, initiative_id: 6 },
  ],
  fx_budget: [
    // result 1 / initiative 5 is the real row; the others share ONE of the two join values
    { budget_row_id: 1, result_id: 1, initiative_id: 5, amount_id: 100 },
    { budget_row_id: 2, result_id: 1, initiative_id: 9, amount_id: 999 },
    { budget_row_id: 3, result_id: 2, initiative_id: 6, amount_id: 200 },
    { budget_row_id: 4, result_id: 2, initiative_id: 5, amount_id: 998 },
  ],
  fx_file: [
    {
      file_row_id: 1,
      result_id: 1,
      is_active: 1,
      url: 'mid',
      created_date: new Date(2026, 1, 1),
    },
    {
      file_row_id: 2,
      result_id: 1,
      is_active: 1,
      url: 'new',
      created_date: new Date(2026, 2, 1),
    },
    {
      file_row_id: 3,
      result_id: 1,
      is_active: 1,
      url: 'old',
      created_date: new Date(2026, 0, 1),
    },
  ],
  fx_parent: [
    { parent_row_id: 11, result_id: 1, name_id: 1, label: 'a' },
    { parent_row_id: 12, result_id: 1, name_id: 2, label: 'b' },
  ],
  fx_child: [
    { child_row_id: 1, parent_ref: 11, val: 111 },
    { child_row_id: 2, parent_ref: 12, val: 222 },
  ],
};

const BUDGET = pathField(
  'fx.budget',
  'multi_select',
  [
    {
      table: 'fx_budget',
      join: [
        { from: 'id', to: 'result_id' },
        { from: 'initiative_id', to: 'initiative_id' },
      ],
    },
  ],
  'amount_id',
);

const fileStep = (direction: 'asc' | 'desc') => ({
  table: 'fx_file',
  join: [{ from: 'id', to: 'result_id' }],
  filter: { is_active: 1 },
  pick: { order_by: 'created_date', direction },
});

const parentStep = {
  table: 'fx_parent',
  join: [{ from: 'id', to: 'result_id' }],
};

const ITEMS = pathField('fx.items', 'list', [parentStep], 'name_id', [
  {
    key: 'child',
    label: 'child',
    type: 'single_select',
    storage: {
      kind: 'path',
      steps: [
        {
          table: 'fx_child',
          join: [{ from: 'parent_row_id', to: 'parent_ref' }],
        },
      ],
      value_column: 'val',
    },
  },
  {
    key: 'label',
    label: 'label',
    type: 'text',
    storage: { kind: 'column', table: 'fx_parent', column: 'label' },
  },
  {
    key: 'kind',
    label: 'kind',
    type: 'single_select',
    storage: {
      kind: 'lookup',
      source: 'clarisa.institutions',
      keys: [{ from: 'label', to: 'id' }],
      value_column: 'type_id',
    },
  },
]);

describe('resolvePathFields', () => {
  it('every join pair must hold: result 1 reads only its own initiative row', async () => {
    const { values } = await resolvePathFields([BUDGET], [1, 2], ctx(DB));
    expect(values.get(1)).toEqual({ 'fx.budget': [100] });
    expect(values.get(2)).toEqual({ 'fx.budget': [200] });
  });

  it('pick desc reads the newest active row; the step filter keeps inactive ones out', async () => {
    const db = {
      ...DB,
      fx_file: [
        ...DB.fx_file,
        {
          file_row_id: 4,
          result_id: 1,
          is_active: 0,
          url: 'inactive-newest',
          created_date: new Date(2026, 9, 1),
        },
      ],
    };
    const desc = await resolvePathFields(
      [pathField('fx.file', 'text', [fileStep('desc')], 'url')],
      [1],
      ctx(db),
    );
    expect(desc.values.get(1)).toEqual({ 'fx.file': 'new' });
    const asc = await resolvePathFields(
      [pathField('fx.file', 'text', [fileStep('asc')], 'url')],
      [1],
      ctx(db),
    );
    expect(asc.values.get(1)).toEqual({ 'fx.file': 'old' });
  });

  it('a subfield path starts at its parent element: each parent gets its own child, keys come from the catalog', async () => {
    const { values, deferred } = await resolvePathFields([ITEMS], [1], ctx(DB));
    expect(values.get(1)).toEqual({
      'fx.items': [
        { child: 111, label: 'a' },
        { child: 222, label: 'b' },
      ],
    });
    expect(deferred).toEqual([
      { fieldKey: 'fx.items', subfieldPath: ['kind'], kind: 'lookup' },
    ]);
  });

  it('follows several steps from the previous row; a result that reaches nothing gets []', async () => {
    const chain = pathField(
      'fx.chain',
      'multi_select',
      [
        parentStep,
        {
          table: 'fx_child',
          join: [{ from: 'parent_row_id', to: 'parent_ref' }],
        },
      ],
      'val',
    );
    const { values } = await resolvePathFields([chain], [1, 2], ctx(DB));
    expect(values.get(1)).toEqual({ 'fx.chain': [111, 222] });
    expect(values.get(2)).toEqual({ 'fx.chain': [] });
  });

  it('a scalar with subfields is { value, <subfield> }, with every key present when nothing is reached', async () => {
    const scalar = pathField(
      'fx.first',
      'single_select',
      [
        {
          ...parentStep,
          pick: { order_by: 'parent_row_id', direction: 'asc' },
        },
      ],
      'name_id',
      [
        {
          key: 'label',
          label: 'label',
          type: 'text',
          storage: { kind: 'column', table: 'fx_parent', column: 'label' },
        },
      ],
    );
    const { values } = await resolvePathFields([scalar], [1, 2], ctx(DB));
    expect(values.get(1)).toEqual({ 'fx.first': { value: 1, label: 'a' } });
    expect(values.get(2)).toEqual({ 'fx.first': { value: null, label: null } });
  });

  it('fields with equal steps share one traversal; an empty batch runs no query', async () => {
    const second = { ...BUDGET, key: 'fx.budget2' };
    const run = fixtureRunner(DB);
    await resolvePathFields([BUDGET, second], [1, 2], {
      run,
      keys,
      resultTable: 'fx_result',
    });
    expect(run.calls.map((c) => c.table)).toEqual(['fx_result', 'fx_budget']);

    const idle = fixtureRunner(DB);
    const out = await resolvePathFields([BUDGET], [], {
      run: idle,
      keys,
      resultTable: 'fx_result',
    });
    expect(out.values.size).toBe(0);
    expect(idle.calls).toHaveLength(0);
  });
});
