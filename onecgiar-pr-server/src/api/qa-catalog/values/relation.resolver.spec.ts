// @akili-spec quality-assurance/qa-results-feed
// QRF-DD-7 / QRF-R-7 for `relation` bindings: element rules, identity order, shapes, null / [] fill.
import { resolveRelationPlan } from './relation.resolver';
import {
  FIXTURE_DB,
  FIXTURE_KEYS,
  FX_LINK,
  FX_PARTNERS,
  FX_PRIMARY_TAG,
  FX_TAG_WITH_NOTE,
  FX_TAGS,
  fixtureRunner,
} from './fixtures';
import { RelationReadPlan, buildReadPlans } from './read-plan';

const plan = (...fields: Parameters<typeof buildReadPlans>[0]) =>
  buildReadPlans(fields, FIXTURE_KEYS).plans[0] as RelationReadPlan;

describe('resolveRelationPlan', () => {
  it('a NULL value row and a row failing the filter are not elements: result 1 has exactly one tag', async () => {
    // fx_tag holds 3 rows for result 1: one real tag, one with a NULL tag_id, one inactive
    const out = await resolveRelationPlan(
      plan(FX_TAGS),
      [1, 2],
      fixtureRunner(),
    );
    expect(out.get(1)?.['fx.tags']).toHaveLength(1);
    expect(out.get(1)).toEqual({ 'fx.tags': [10] });
    expect(out.get(2)).toEqual({ 'fx.tags': [20] });
  });

  it('fields sharing a plan apply the NULL rule to their own value column', async () => {
    const out = await resolveRelationPlan(
      plan(FX_TAGS, FX_PRIMARY_TAG),
      [1],
      fixtureRunner(),
    );
    // tags: row 2 (NULL tag_id) is out; primary_id: row 1 (NULL primary_id) is out, so the first primary is row 2's
    expect(out.get(1)).toEqual({ 'fx.tags': [10], 'fx.primary_tag': 11 });
  });

  it('multi_select with no rows is [], single_select with no rows is null', async () => {
    const run = fixtureRunner({ fx_tag: [] });
    const out = await resolveRelationPlan(
      plan(FX_TAGS, FX_PRIMARY_TAG),
      [1],
      run,
    );
    expect(out.get(1)).toEqual({ 'fx.tags': [], 'fx.primary_tag': null });
  });

  it('list: one object per element, in primary-key order, keyed by subfield key and typed (tinyint -> boolean)', async () => {
    const out = await resolveRelationPlan(
      plan(FX_PARTNERS),
      [1],
      fixtureRunner(),
    );
    expect(out.get(1)).toEqual({
      'fx.partners': [
        { partner: 100, is_lead: false, note: null },
        { partner: 200, is_lead: true, note: 'b' },
      ],
    });
  });

  it('a list with no rows is []; the role filter keeps the role-3 row out', async () => {
    const out = await resolveRelationPlan(
      plan(FX_PARTNERS),
      [1, 2],
      fixtureRunner(),
    );
    expect((out.get(1)?.['fx.partners'] as unknown[]).length).toBe(2);
    expect(out.get(2)).toEqual({ 'fx.partners': [] });
  });

  it('a filter on NULL keeps only the rows whose column IS NULL', async () => {
    const out = await resolveRelationPlan(plan(FX_LINK), [1], fixtureRunner());
    expect(out.get(1)).toEqual({ 'fx.link': 'https://workshop' });
  });

  it('subfield keys come from the catalog only: a stored column that is not a subfield never appears', async () => {
    const out = await resolveRelationPlan(
      plan(FX_PARTNERS),
      [1],
      fixtureRunner(),
    );
    const first = (
      out.get(1)?.['fx.partners'] as Array<Record<string, unknown>>
    )[0];
    expect(Object.keys(first)).toEqual(['partner', 'is_lead', 'note']);
  });

  it('rows of one result never leak into another', async () => {
    const out = await resolveRelationPlan(plan(FX_TAGS), [2], fixtureRunner());
    expect(out.get(2)).toEqual({ 'fx.tags': [20] });
    expect(FIXTURE_DB.fx_tag.some((r) => r.result_id === 1)).toBe(true);
  });

  it('a scalar relation with subfields is { value, <column subfield> } from its first element; no element -> value null', async () => {
    const run = fixtureRunner({
      fx_tag: [
        {
          tag_row_id: 1,
          result_id: 1,
          is_active: 1,
          primary_id: 11,
          note: 'n',
        },
      ],
    });
    const out = await resolveRelationPlan(plan(FX_TAG_WITH_NOTE), [1, 2], run);
    expect(out.get(1)).toEqual({
      'fx.tag_with_note': { value: 11, note: 'n' },
    });
    expect(out.get(2)).toEqual({
      'fx.tag_with_note': { value: null, note: null },
    });
  });
});
