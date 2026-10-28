// @akili-spec quality-assurance/qa-results-feed
// QRF NFR "Query shape" and QRF-R-7 fill: the statement count does not move with the batch size.
import {
  FIXTURE_KEYS,
  FX_BUDGET,
  FX_LINK,
  FX_OPEN,
  FX_PARTNERS,
  FX_PATH_FIELD,
  FX_PRIMARY_TAG,
  FX_SCORE,
  FX_TAGS,
  FX_TITLE,
  fixtureRunner,
} from './fixtures';
import { READ_CONCURRENCY, readBaseValues } from './value-reader';
import { PlanQuery } from './read-plan';

const FIELDS = [
  FX_TITLE,
  FX_OPEN,
  FX_BUDGET,
  FX_SCORE,
  FX_TAGS,
  FX_PRIMARY_TAG,
  FX_PARTNERS,
  FX_LINK,
  FX_PATH_FIELD,
];

describe('readBaseValues', () => {
  it('runs one statement per plan, the same for 1 result and for 50', async () => {
    const one = fixtureRunner();
    await readBaseValues(FIELDS, [1], { run: one, keys: FIXTURE_KEYS });

    const many = fixtureRunner();
    const ids = Array.from({ length: 50 }, (_, i) => i + 1);
    await readBaseValues(FIELDS, ids, { run: many, keys: FIXTURE_KEYS });

    // fx_result, fx_type, fx_tag, fx_partner, fx_link
    expect(one.calls).toHaveLength(5);
    expect(many.calls).toHaveLength(5);
  });

  it('every result gets every planned field: null / [] fill, never absent', async () => {
    const { values } = await readBaseValues(FIELDS, [1, 2, 99], {
      run: fixtureRunner(),
      keys: FIXTURE_KEYS,
    });
    const keys = [
      'fx.title',
      'fx.is_open',
      'fx.budget',
      'fx.score',
      'fx.tags',
      'fx.primary_tag',
      'fx.partners',
      'fx.link',
    ];
    for (const id of [1, 2, 99])
      expect(Object.keys(values.get(id) ?? {}).sort()).toEqual(
        [...keys].sort(),
      );
    expect(values.get(99)).toEqual({
      'fx.title': null,
      'fx.is_open': null,
      'fx.budget': null,
      'fx.score': null,
      'fx.tags': [],
      'fx.primary_tag': null,
      'fx.partners': [],
      'fx.link': null,
    });
  });

  it('duplicate ids are read once; no ids means no statement', async () => {
    const run = fixtureRunner();
    const { values } = await readBaseValues([FX_TITLE], [1, 1, 2, 2], {
      run,
      keys: FIXTURE_KEYS,
    });
    expect([...values.keys()]).toEqual([1, 2]);
    expect(run.calls[0].where[0]).toEqual({
      column: 'id',
      op: 'in',
      values: [1, 2],
    });

    const none = fixtureRunner();
    const empty = await readBaseValues(FIELDS, [], {
      run: none,
      keys: FIXTURE_KEYS,
    });
    expect(none.calls).toHaveLength(0);
    expect(empty.values.size).toBe(0);
  });

  it('hands back the bindings it did not read', async () => {
    const { deferred } = await readBaseValues(FIELDS, [1], {
      run: fixtureRunner(),
      keys: FIXTURE_KEYS,
    });
    expect(
      deferred.map(
        (d) => `${d.fieldKey}/${d.subfieldPath.join('.')}/${d.kind}`,
      ),
    ).toEqual(['fx.partners/partner_type/lookup', 'fx.deep//path']);
  });

  it(`never has more than ${READ_CONCURRENCY} plans in flight`, async () => {
    let inFlight = 0;
    let peak = 0;
    const slow = async (_q: PlanQuery) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      return [];
    };
    // 6 distinct tables -> 6 plans
    const fields = ['a', 'b', 'c', 'd', 'e', 'f'].map((t) => ({
      ...FX_TITLE,
      key: `fx.${t}`,
      storage: {
        kind: 'column' as const,
        table: `fx_result_${t}`,
        column: 'title',
      },
    }));
    const keys = {
      ...FIXTURE_KEYS,
      primaryKey: () => 'id',
      resultKey: () => 'id',
    };
    await readBaseValues(fields, [1], { run: slow, keys });
    expect(peak).toBe(READ_CONCURRENCY);
  });
});
