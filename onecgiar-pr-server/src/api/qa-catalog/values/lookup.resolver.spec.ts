// @akili-spec quality-assurance/qa-results-feed
// QRF-DD-8 / QRF-R-7: lookup values over a fixture ToC. Every source below holds SEVERAL candidate rows per key, so
// alternatives, `pick` and the year qualifier each have something to choose between.
import {
  PHASE_YEAR,
  CatalogField,
  CatalogSubField,
} from '../definitions/types';
import { FixtureDb, failingOn, fixtureRunner } from './fixtures';
import { resolveLookups } from './lookup.resolver';
import { DeferredBinding, PlanReadError } from './read-plan';

const TOC = 'toc.integration_information.';
const ENV = { DB_TOC: 'toc_fx' };
const base = {
  section: 'fx',
  order: 1,
  result_types: ['*'],
  required: false,
  required_confirmed: false,
  valid_from: 2026,
  valid_to: null,
};
const sub = (
  key: string,
  type: CatalogSubField['type'],
  storage: CatalogSubField['storage'],
): CatalogSubField => ({ key, label: key, type, storage });
const column = (c: string) => ({
  kind: 'column' as const,
  table: 'fx',
  column: c,
});
const field = (
  key: string,
  type: CatalogField['type'],
  subfields: CatalogSubField[] = [],
): CatalogField => ({
  ...base,
  key,
  label: key,
  type,
  storage: { kind: 'column', table: 'fx', column: key },
  subfields,
});

// the KPI shape of the catalog: either key of the indicator may match; the target also needs the request's year
const KPI_KEYS = [
  { from: 'kpi', to: 'related_node_id' },
  { from: 'kpi', to: 'id' },
];
const ENTRIES = field('kpi.entries', 'list', [
  sub('kpi', 'single_select', column('kpi')),
  sub('toc_result', 'single_select', column('toc_result')),
  sub('type_name', 'text', {
    kind: 'lookup',
    source: `${TOC}toc_results_indicators`,
    keys: KPI_KEYS,
    value_column: 'type_name',
  }),
  sub('target', 'number', {
    kind: 'lookup',
    source: `${TOC}toc_result_indicator_target`,
    keys: [
      { from: 'kpi', to: 'toc_result_indicator_id' },
      { from: 'kpi', to: 'id_indicator' },
    ],
    qualifiers: [{ column: 'target_date', equals: PHASE_YEAR, match: 'year' }],
    pick: { order_by: 'target_date', direction: 'desc' },
    value_column: 'target_value',
  }),
  sub('description', 'text', {
    kind: 'lookup',
    source: `${TOC}toc_results`,
    keys: [{ from: 'toc_result', to: 'id' }],
    value_column: 'result_description',
  }),
]);
// the same key as a TOP-LEVEL value, which a sibling of the same name must beat
const TOP_TOC_RESULT = field('toc_result', 'single_select');

const t = (
  id: number,
  ind: string | number,
  node: string,
  date: string,
  v: number,
) => ({
  toc_indicator_target_id: id,
  toc_result_indicator_id: node,
  id_indicator: ind,
  target_date: date,
  target_value: v,
});
const DB: FixtureDb = {
  toc_results_indicators: [
    { id: 11, related_node_id: 'node-1', type_name: 'Counter' },
    { id: 12, related_node_id: 'node-2', type_name: 'Percent' },
    { id: 13, related_node_id: 'node-3', type_name: 'Other' },
  ],
  toc_result_indicator_target: [
    t(1, 11, 'node-1', '2025', 10),
    t(2, 11, 'node-1', '2026-06-30', 20),
    t(3, 12, 'node-2', '2025-12-31', 30),
    t(4, 12, 'node-2', '2026', 40),
    t(5, 13, 'node-3', '2026', 50),
    t(6, 13, 'node-3', '2026-06-30', 60),
    t(7, 13, 'node-3', '2027-01-01', 70),
  ],
  toc_results: [
    { id: 7, result_description: 'sibling' },
    { id: 99, result_description: 'top-level' },
  ],
};

const deferred = (...keys: string[][]): DeferredBinding[] =>
  keys.map(([fieldKey, ...subfieldPath]) => ({
    fieldKey,
    subfieldPath,
    kind: 'lookup',
  }));
const LOOKUPS = deferred(
  ['kpi.entries', 'type_name'],
  ['kpi.entries', 'target'],
  ['kpi.entries', 'description'],
);
const run = async (
  values: Map<number, Record<string, unknown>>,
  db: FixtureDb = DB,
  fields = [ENTRIES, TOP_TOC_RESULT],
) => {
  const runner = fixtureRunner(db);
  await resolveLookups(
    fields,
    { values, deferred: LOOKUPS },
    { run: runner, phaseYear: 2026, env: ENV },
  );
  return runner;
};
const entries = (values: Map<number, Record<string, unknown>>, id: number) =>
  values.get(id)?.['kpi.entries'] as Array<Record<string, unknown>>;

describe('resolveLookups', () => {
  const batch = () =>
    new Map<number, Record<string, unknown>>([
      [
        1,
        {
          toc_result: 99,
          'kpi.entries': [
            { kpi: 'node-1', toc_result: 7 }, // matches `related_node_id`
            { kpi: 12, toc_result: null }, // matches `id`
          ],
        },
      ],
      [
        2,
        { toc_result: 99, 'kpi.entries': [{ kpi: 'node-3', toc_result: 7 }] },
      ],
    ]);

  it('alternatives are OR: a key that matches `related_node_id` for one row and `id` for another resolves both', async () => {
    const values = batch();
    await run(values);
    expect(entries(values, 1).map((e) => e.type_name)).toEqual([
      'Counter',
      'Percent',
    ]);
    expect(entries(values, 2)[0].type_name).toBe('Other');
  });

  it('`match: year` reads `2026` and `2026-06-30` alike; `pick` takes the first of what is left', async () => {
    const values = batch();
    await run(values);
    // 20: date form only; 40: `YYYY` form; 60: desc pick among 2026 and 2026-06-30 (2027-01-01 is not 2026)
    expect(entries(values, 1).map((e) => e.target)).toEqual([20, 40]);
    expect(entries(values, 2)[0].target).toBe(60);
  });

  it('a sibling subfield beats the top-level key of the same name, and a null sibling does not fall back', async () => {
    const values = batch();
    await run(values);
    expect(entries(values, 1).map((e) => e.description)).toEqual([
      'sibling',
      null,
    ]);
  });

  it('a failing source leaves as a PlanReadError that names the field and nothing of the cause', async () => {
    const attempt = resolveLookups(
      [ENTRIES, TOP_TOC_RESULT],
      { values: batch(), deferred: LOOKUPS },
      { run: failingOn('toc_results', DB), phaseYear: 2026, env: ENV },
    );
    await expect(attempt).rejects.toBeInstanceOf(PlanReadError);
    await expect(attempt).rejects.toMatchObject({ fieldKeys: ['kpi.entries'] });
    await expect(attempt).rejects.not.toThrow(/prdb_secret|toc_|exist|Table/i);
  });

  it('one SELECT per source for the whole batch, on the configured ToC database', async () => {
    const runner = await run(batch());
    expect(runner.calls.map((c) => c.table).sort()).toEqual([
      'toc_result_indicator_target',
      'toc_results',
      'toc_results_indicators',
    ]);
    expect(new Set(runner.calls.map((c) => c.schema))).toEqual(
      new Set(['toc_fx']),
    );
  });

  it('reads nothing when the batch holds no key; the key is still present, null', async () => {
    const values = new Map([
      [1, { 'kpi.entries': [{ kpi: null, toc_result: null }] }],
    ]);
    const runner = await run(values);
    expect(runner.calls).toHaveLength(0);
    expect(entries(values, 1)[0]).toMatchObject({
      type_name: null,
      target: null,
      description: null,
    });
  });

  it('fills a lookup subfield of a scalar field with subfields, and a top-level lookup field', async () => {
    const lead = field('fx.lead', 'single_select', [
      sub('institution', 'single_select', column('institution_id')),
      sub('institution_type', 'single_select', {
        kind: 'lookup',
        source: 'clarisa.institutions',
        keys: [{ from: 'institution', to: 'id' }],
        value_column: 'type_code',
      }),
    ]);
    const topLevel: CatalogField = {
      ...field('fx.reason_flag', 'boolean'),
      storage: {
        kind: 'lookup',
        source: 'prms.investment_discontinued_option',
        keys: [{ from: 'fx.reason', to: 'investment_discontinued_option_id' }],
        value_column: 'requires_description',
      },
    };
    const values = new Map([
      [1, { 'fx.lead': { value: 5, institution: 100 }, 'fx.reason': 3 }],
    ]);
    await resolveLookups(
      [lead, topLevel],
      {
        values,
        deferred: deferred(['fx.lead', 'institution_type'], ['fx.reason_flag']),
      },
      {
        run: fixtureRunner({
          clarisa_institutions: [{ id: 100, type_code: 4 }],
          investment_discontinued_option: [
            { investment_discontinued_option_id: 3, requires_description: 1 },
          ],
        }),
        phaseYear: 2026,
      },
    );
    expect(values.get(1)).toEqual({
      'fx.lead': { value: 5, institution: 100, institution_type: 4 },
      'fx.reason': 3,
      'fx.reason_flag': true,
    });
  });

  it('an unavailable source fails with the field key and no source, table or configuration name', async () => {
    const attempt = resolveLookups(
      [ENTRIES],
      { values: batch(), deferred: LOOKUPS },
      { run: fixtureRunner(DB), phaseYear: 2026, env: {} },
    );
    await expect(attempt).rejects.toThrow(
      'lookup resolver: field kpi.entries reads a source that is not available',
    );
    await expect(attempt).rejects.not.toThrow(/toc|DB_TOC|clarisa/i);
  });
});
