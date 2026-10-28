// @akili-spec quality-assurance/qa-results-feed
// QRF-R-7 / QRF-DD-9 for top-level `column` bindings.
import { resolveColumnPlan } from './column.resolver';
import {
  FIXTURE_KEYS,
  FX_BUDGET,
  FX_DUE,
  FX_OPEN,
  FX_SCORE,
  FX_TITLE,
  fixtureRunner,
} from './fixtures';
import { ColumnReadPlan, buildReadPlans } from './read-plan';

const plan = (...fields: Parameters<typeof buildReadPlans>[0]) =>
  buildReadPlans(fields, FIXTURE_KEYS).plans[0] as ColumnReadPlan;

describe('resolveColumnPlan', () => {
  it('types each cell by its field type: tinyint 0 -> false, DECIMAL string -> number, DATE -> YYYY-MM-DD', async () => {
    const out = await resolveColumnPlan(
      plan(FX_TITLE, FX_OPEN, FX_BUDGET, FX_DUE),
      [1, 2],
      fixtureRunner(),
    );
    expect(out.get(1)).toEqual({
      'fx.title': 'One',
      'fx.is_open': false,
      'fx.budget': 12.5,
      'fx.due': '2026-06-30',
    });
    expect(out.get(2)).toEqual({
      'fx.title': null,
      'fx.is_open': true,
      'fx.budget': null,
      'fx.due': null,
    });
  });

  it('a result with no row in the table holds null for every field, never absent', async () => {
    const out = await resolveColumnPlan(
      plan(FX_SCORE),
      [1, 2],
      fixtureRunner(),
    );
    expect(out.get(2)).toEqual({ 'fx.score': null });
  });

  it('when several rows match a result the lowest primary key is read', async () => {
    const out = await resolveColumnPlan(plan(FX_SCORE), [1], fixtureRunner());
    expect(out.get(1)).toEqual({ 'fx.score': 3 });
  });

  it('asks only for the requested results, in one statement', async () => {
    const run = fixtureRunner();
    await resolveColumnPlan(plan(FX_TITLE, FX_OPEN), [1, 2], run);
    expect(run.calls).toHaveLength(1);
    expect(run.calls[0].where).toEqual([
      { column: 'id', op: 'in', values: [1, 2] },
    ]);
  });
});
