// @akili-spec quality-assurance/qa-value-labels
// QVL-R-3 / R-4 / R-7 / R-9, D-5: the label resolver over a fixture database. The fixture runner evaluates every `PlanQuery` predicate
// (`any_in`, `eq`) over its rows, so a mutated plan (a dropped id, an added `is_active` filter, one query per id) shows. Synthetic data.
import { LabelPairs } from './label-collector';
import {
  DRIVER_LEAK,
  FixtureDb,
  RecordingRunner,
  failingOn,
  fixtureRunner,
} from './fixtures';
import { resolveLabels } from './label.resolver';
import { PlanQuery, PlanQueryRunner } from './read-plan';

const ENV = { DB_TOC: 'toc_fx' };

const pairs = (spec: Record<string, Array<string | number>>): LabelPairs =>
  new Map(
    Object.entries(spec).map(([list, ids]) => [list, new Set(ids.map(String))]),
  );

/** `Map<list, Map<id, label>>` as a plain object, for literal expectations. */
const plain = (m: Map<string, Map<string, string | null>>) =>
  Object.fromEntries([...m].map(([l, ids]) => [l, Object.fromEntries(ids)]));

const DB: FixtureDb = {
  clarisa_countries: [
    { id: 170, name: ' Colombia ' },
    { id: 840, name: 'United States' },
  ],
  // id 301 is INACTIVE and still labels (OQ-1); no row for 999
  clarisa_institutions: [
    {
      id: 300,
      name: 'International Center for Tropical Agriculture',
      acronym: 'CIAT',
      is_active: 1,
    },
    { id: 301, name: 'Retired Partner', acronym: null, is_active: 0 },
    { id: 302, name: 'Orphan Institution', acronym: 'ORP', is_active: 1 },
  ],
  clarisa_center: [
    { code: 'CENTER-02', institutionId: 300 },
    { code: 'CENTER-03', institutionId: 777 }, // its institution row is missing
    { code: 'CENTER-04', institutionId: null },
  ],
  result: [{ id: 5, result_code: 1234, title: ' Maize yield ' }],
  result_type: [
    { id: 3, name: 'Capacity change' },
    { id: 9, name: 'Impact contribution' }, // the form says "Impact result" (override)
  ],
  result_questions: [
    { result_question_id: 1, question_text: 'Gender question' },
    { result_question_id: 2, question_text: 'Risk question' },
    { result_question_id: 3, question_text: 'IPR question' },
  ],
  capdevs_term: [{ capdev_term_id: 4, name: 'Long-term' }],
  toc_results: [{ id: 4001, result_title: 'A ToC result' }],
  toc_results_indicators: [
    // node-1: an inactive row with the LOWEST pk, then two active rows: the active row with the lowest pk (12) labels it
    {
      id: 11,
      related_node_id: 'node-1',
      indicator_description: 'Inactive low',
      is_active: 0,
    },
    {
      id: 13,
      related_node_id: 'node-1',
      indicator_description: 'Active high',
      is_active: 1,
    },
    {
      id: 12,
      related_node_id: 'node-1',
      indicator_description: 'Active low',
      is_active: 1,
    },
    // node-2: only inactive rows, still labelled, lowest pk first (OQ-1)
    {
      id: 22,
      related_node_id: 'node-2',
      indicator_description: 'Inactive B',
      is_active: 0,
    },
    {
      id: 21,
      related_node_id: 'node-2',
      indicator_description: 'Inactive A',
      is_active: 0,
    },
    // a legacy numeric id matches the row's own `id`
    {
      id: 31,
      related_node_id: 'node-9',
      indicator_description: 'By row id',
      is_active: 1,
    },
  ],
  toc_results_melias: [
    { id: 5, melia_id: 'm-1', title: 'Higher pk' },
    { id: 2, melia_id: 'm-1', title: 'Lowest pk' },
    { id: 8, melia_id: 'm-2', title: 'Other study' },
  ],
};

const run = () => fixtureRunner(DB);
const resolve = (spec: Record<string, Array<string | number>>, r = run()) =>
  resolveLabels(pairs(spec), { run: r, env: ENV });

/** A runner that hands back every statement's rows in DESCENDING order of its `orderBy`: a pick that trusts row order is red. */
const reversing = (): RecordingRunner => {
  const inner = fixtureRunner(DB);
  const reversed = (async (q: PlanQuery) =>
    [...(await inner(q))].reverse()) as RecordingRunner;
  Object.defineProperty(reversed, 'calls', { value: inner.calls });
  return reversed;
};

describe('label resolver: table sources', () => {
  it('a numeric key column matches ids that arrive as strings; every id is a string key', async () => {
    const out = await resolve({ countries: [170, '840'] });
    expect(plain(out)).toEqual({
      countries: { '170': 'Colombia', '840': 'United States' },
    });
  });

  it('an id with no row is null and stays in the map; the other ids are answered (QVL-R-4)', async () => {
    const out = await resolve({ countries: [170, 999] });
    expect(plain(out)).toEqual({
      countries: { '170': 'Colombia', '999': null },
    });
  });

  it('an INACTIVE row still labels (OQ-1)', async () => {
    const runner = run();
    const out = await resolve({ institutions: [300, 301, 999] }, runner);
    expect(plain(out)).toEqual({
      institutions: {
        '300': 'International Center for Tropical Agriculture',
        '301': 'Retired Partner',
        '999': null,
      },
    });
    // the read carries no filter on a flag
    expect(
      runner.calls.flatMap((c) => c.where).filter((p) => p.op !== 'any_in'),
    ).toEqual([]);
  });

  it('a composed label is built in TypeScript from the row (code - title)', async () => {
    const out = await resolve({ results: [5] });
    expect(plain(out)).toEqual({ results: { '5': '1234 - Maize yield' } });
  });

  it('lists that share a table share ONE statement, and each list keeps only its own ids', async () => {
    const runner = run();
    const out = await resolve(
      {
        question_options_gesi_stage: [1],
        question_options_risk_stage: [2],
        question_options_ipr: [3, 99],
        policy_related_questions: [1, 2],
      },
      runner,
    );
    expect(runner.calls.map((c) => c.table)).toEqual(['result_questions']);
    expect(plain(out)).toEqual({
      question_options_gesi_stage: { '1': 'Gender question' },
      question_options_risk_stage: { '2': 'Risk question' },
      question_options_ipr: { '3': 'IPR question', '99': null },
      policy_related_questions: {
        '1': 'Gender question',
        '2': 'Risk question',
      },
    });
  });

  it('the capacity-sharing term lists share a statement', async () => {
    const runner = run();
    const out = await resolve(
      { capdev_training_lengths: [4], capdev_degrees: [4] },
      runner,
    );
    expect(runner.calls).toHaveLength(1);
    expect(plain(out)).toEqual({
      capdev_training_lengths: { '4': 'Long-term' },
      capdev_degrees: { '4': 'Long-term' },
    });
  });

  it('a constant override wins over the row, found or not, and the other ids keep the row text', async () => {
    const out = await resolve({ result_types: [3, 9] });
    expect(plain(out)).toEqual({
      result_types: { '3': 'Capacity change', '9': 'Impact result' },
    });
    const none = await resolveLabels(pairs({ result_types: [9] }), {
      run: fixtureRunner({}),
      env: ENV,
    });
    expect(plain(none)).toEqual({ result_types: { '9': 'Impact result' } });
  });

  it('a text key column matches the text id (and collates case-insensitively, as the column does)', async () => {
    const out = await resolve({ centers: ['CENTER-02', 'center-02'] });
    expect(out.get('centers')?.get('CENTER-02')).toBe(
      'CIAT - International Center for Tropical Agriculture',
    );
    expect(out.get('centers')?.get('center-02')).toBe(
      'CIAT - International Center for Tropical Agriculture',
    );
  });
});

describe('label resolver: constants', () => {
  it('resolve in memory with no statement; an unknown id is null; keys are strings', async () => {
    const runner = run();
    const out = await resolve(
      {
        policy_amount_statuses: ['2', '7'],
        geographic_scopes: [4, 50],
        actor_count_unit: ['households', 'constructor'],
      },
      runner,
    );
    expect(runner.calls).toEqual([]);
    expect(plain(out)).toEqual({
      policy_amount_statuses: { '2': 'Estimated', '7': null },
      geographic_scopes: {
        '4': 'Country',
        '50': 'This is yet to be determined',
      },
      actor_count_unit: { households: 'Households', constructor: null },
    });
  });
});

describe('label resolver: chained source (centers)', () => {
  it('reads the center, then its institution, and labels `acronym - name`', async () => {
    const runner = run();
    const out = await resolve(
      { centers: ['CENTER-02', 'CENTER-03', 'CENTER-04', 'CENTER-99'] },
      runner,
    );
    expect(plain(out)).toEqual({
      centers: {
        'CENTER-02': 'CIAT - International Center for Tropical Agriculture',
        'CENTER-03': null, // institution row missing
        'CENTER-04': null, // no institution on the center
        'CENTER-99': null, // no center row
      },
    });
    expect(runner.calls.map((c) => c.table)).toEqual([
      'clarisa_center',
      'clarisa_institutions',
    ]);
  });

  it('issues no follow-up when no center carries an institution', async () => {
    const runner = fixtureRunner({
      clarisa_center: [{ code: 'CENTER-04', institutionId: null }],
    });
    const out = await resolveLabels(pairs({ centers: ['CENTER-04'] }), {
      run: runner,
      env: ENV,
    });
    expect(runner.calls.map((c) => c.table)).toEqual(['clarisa_center']);
    expect(plain(out)).toEqual({ centers: { 'CENTER-04': null } });
  });
});

describe('label resolver: ToC sources (schema from DB_TOC, deterministic pick)', () => {
  it('reads the ToC schema', async () => {
    const runner = run();
    await resolve({ toc_results: [4001] }, runner);
    expect(runner.calls[0].schema).toBe('toc_fx');
  });

  it('indicators: the ACTIVE row with the lowest pk wins, whatever the order the rows arrive in', async () => {
    for (const runner of [run(), reversing()]) {
      const out = await resolve({ toc_results_indicators: ['node-1'] }, runner);
      expect(plain(out)).toEqual({
        toc_results_indicators: { 'node-1': 'Active low' },
      });
    }
  });

  it('indicators: an id whose only rows are inactive still gets the lowest-pk inactive text (OQ-1)', async () => {
    for (const runner of [run(), reversing()]) {
      const out = await resolve({ toc_results_indicators: ['node-2'] }, runner);
      expect(plain(out)).toEqual({
        toc_results_indicators: { 'node-2': 'Inactive A' },
      });
    }
  });

  it('indicators: a stored id that is the numeric row id matches too; no row is null', async () => {
    const out = await resolve({ toc_results_indicators: ['31', 'nope'] });
    expect(plain(out)).toEqual({
      toc_results_indicators: { '31': 'By row id', nope: null },
    });
  });

  it('melias: the lowest pk wins, whatever the order the rows arrive in', async () => {
    for (const runner of [run(), reversing()]) {
      const out = await resolve({ toc_melia_studies: ['m-1', 'm-2'] }, runner);
      expect(plain(out)).toEqual({
        toc_melia_studies: { 'm-1': 'Lowest pk', 'm-2': 'Other study' },
      });
    }
  });

  it('lists on one ToC table share a statement (eoi_outcomes and toc_results)', async () => {
    const runner = run();
    const out = await resolve(
      { eoi_outcomes: [4001], toc_results: [4001, 5] },
      runner,
    );
    expect(runner.calls).toHaveLength(1);
    expect(plain(out)).toEqual({
      eoi_outcomes: { '4001': 'A ToC result' },
      toc_results: { '4001': 'A ToC result', '5': null },
    });
  });
});

describe('label resolver: failures stop the batch (QVL-R-9)', () => {
  it('an unconfigured ToC database THROWS, issues no statement and never yields null labels', async () => {
    const runner = run();
    await expect(
      resolveLabels(pairs({ countries: [170], toc_results: [4001] }), {
        run: runner,
        env: {},
      }),
    ).rejects.toThrow(
      'label resolver: list toc_results reads a source that is not available',
    );
    expect(runner.calls).toEqual([]);
  });

  it('the ToC database is not needed when the batch touches no ToC list', async () => {
    const out = await resolveLabels(pairs({ countries: [170] }), {
      run: run(),
      env: {},
    });
    expect(plain(out)).toEqual({ countries: { '170': 'Colombia' } });
  });

  it('a throwing statement rejects the whole call: no partial labels', async () => {
    await expect(
      resolveLabels(pairs({ countries: [170], results: [5] }), {
        run: failingOn('result', DB),
        env: ENV,
      }),
    ).rejects.toThrow(DRIVER_LEAK);
  });

  it('a list that has no label source fails, naming the list only', async () => {
    await expect(resolve({ not_a_list: [1] })).rejects.toThrow(
      'label resolver: list not_a_list has no label source',
    );
  });

  it('a stored text that holds `<` comes back as-is and the batch answers (QVL-R-3 amended, R-4)', async () => {
    const db: FixtureDb = {
      result: [
        { id: 1, result_code: 77, title: 'Yield < 5 t/ha' },
        { id: 2, result_code: 78, title: 'Plain title' },
      ],
      clarisa_countries: [{ id: 1, name: 'A <strong>bold</strong> name' }],
    };
    const out = await resolveLabels(
      pairs({ results: [1, 2], countries: [1] }),
      { run: fixtureRunner(db), env: ENV },
    );
    expect(plain(out)).toEqual({
      results: { '1': '77 - Yield < 5 t/ha', '2': '78 - Plain title' },
      countries: { '1': 'A <strong>bold</strong> name' },
    });
  });
});

describe('label resolver: statements depend on the lists, never on ids or results (QVL-R-7, D-5)', () => {
  /** n ids per list over the SAME lists: countries, institutions, centers (chained), results, a ToC list, a constant. */
  const batch = (n: number): { union: LabelPairs; db: FixtureDb } => {
    const ids = Array.from({ length: n }, (_, i) => i + 1);
    const db: FixtureDb = {
      clarisa_countries: ids.map((id) => ({ id, name: `Country ${id}` })),
      clarisa_institutions: ids.map((id) => ({
        id,
        name: `Institution ${id}`,
        acronym: `I${id}`,
      })),
      clarisa_center: ids.map((id) => ({
        code: `CENTER-${id}`,
        institutionId: id,
      })),
      result: ids.map((id) => ({
        id,
        result_code: id,
        title: `Title ${id}`,
      })),
      toc_results: ids.map((id) => ({ id, result_title: `ToC ${id}` })),
    };
    return {
      db,
      union: pairs({
        countries: ids,
        institutions: ids,
        centers: ids.map((id) => `CENTER-${id}`),
        results: ids,
        toc_results: ids,
        policy_amount_statuses: ['1', '2', '3'],
      }),
    };
  };

  const statements = async (n: number) => {
    const { union, db } = batch(n);
    const runner = fixtureRunner(db);
    const out = await resolveLabels(union, { run: runner, env: ENV });
    return { runner, out };
  };

  it('a union of 1 id and a union of 50 ids over the same lists issue the same statements', async () => {
    const one = await statements(1);
    const fifty = await statements(50);
    const tables = (r: RecordingRunner) => r.calls.map((c) => c.table).sort();
    // 5 table statements + 1 chain hop; the constant list adds none
    expect(tables(one.runner)).toEqual([
      'clarisa_center',
      'clarisa_countries',
      'clarisa_institutions',
      'clarisa_institutions',
      'result',
      'toc_results',
    ]);
    expect(tables(fifty.runner)).toEqual(tables(one.runner));
    expect(fifty.runner.calls).toHaveLength(one.runner.calls.length);
  });

  it('the 50-id batch really carries 50 ids per statement, and every id is labelled (the equal count is not vacuous)', async () => {
    const fifty = await statements(50);
    for (const call of fifty.runner.calls) {
      const any = call.where.find((p) => p.op === 'any_in');
      expect(any && 'values' in any && any.values.length).toBe(50);
    }
    expect(fifty.out.get('countries')?.size).toBe(50);
    expect(fifty.out.get('centers')?.get('CENTER-50')).toBe(
      'I50 - Institution 50',
    );
    expect(fifty.out.get('results')?.get('7')).toBe('7 - Title 7');
    expect([...(fifty.out.get('toc_results')?.values() ?? [])]).not.toContain(
      null,
    );
  });

  it('the statements start together: independent groups are in flight before any returns', async () => {
    const started: PlanQuery[] = [];
    const release: Array<() => void> = [];
    const gated: PlanQueryRunner = (query) => {
      started.push(query);
      return new Promise((resolveRows) => release.push(() => resolveRows([])));
    };
    const done = resolveLabels(
      pairs({ countries: [1], results: [1], toc_results: [1], centers: ['C'] }),
      { run: gated, env: ENV },
    );
    // nothing has resolved yet: one statement per independent group is already out (the chain's first hop)
    expect(started.map((q) => q.table).sort()).toEqual([
      'clarisa_center',
      'clarisa_countries',
      'result',
      'toc_results',
    ]);
    release.forEach((r) => r());
    await done;
  });
});
