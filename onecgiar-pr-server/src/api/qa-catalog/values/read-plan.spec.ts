// @akili-spec quality-assurance/qa-results-feed
// QRF-DD-6: read plans group bindings; the statement is parameterized data. Expected counts are literals from the
// fixture catalog, not recomputed from the builder.
import { CATALOG_FIELDS } from '../definitions/sections';
import { CatalogField, RelationBinding } from '../definitions/types';
import {
  FIXTURE_KEYS,
  FX_BUDGET,
  FX_LINK,
  FX_OPEN,
  FX_PARTNERS,
  FX_PATH_FIELD,
  FX_PRIMARY_TAG,
  FX_SCORE,
  FX_TAG_WITH_NOTE,
  FX_TAGS,
  FX_TERM,
  FX_TITLE,
} from './fixtures';
import {
  RelationReadPlan,
  buildReadPlans,
  planColumns,
  planQuery,
  renderPlanSql,
} from './read-plan';
import { entityTableKeys } from './table-metadata';

describe('buildReadPlans: grouping (QRF-DD-6)', () => {
  it('two column bindings on the same table are one plan', () => {
    const { plans } = buildReadPlans([FX_TITLE, FX_OPEN], FIXTURE_KEYS);
    expect(plans).toHaveLength(1);
    expect(plans[0].kind).toBe('column');
  });

  it('a column binding on another table is another plan', () => {
    const { plans } = buildReadPlans(
      [FX_TITLE, FX_BUDGET, FX_SCORE],
      FIXTURE_KEYS,
    );
    expect(plans.map((p) => p.table)).toEqual(['fx_result', 'fx_type']);
  });

  it('relations with the same table, foreign key and filter are one plan that selects every value column', () => {
    const { plans } = buildReadPlans([FX_TAGS, FX_PRIMARY_TAG], FIXTURE_KEYS);
    expect(plans).toHaveLength(1);
    expect(planColumns(plans[0])).toEqual([
      'tag_row_id',
      'result_id',
      'tag_id',
      'primary_id',
    ]);
  });

  it('a different filter on the same table is another plan', () => {
    const binding = FX_PRIMARY_TAG.storage as RelationBinding;
    const otherFilter: CatalogField = {
      ...FX_PRIMARY_TAG,
      storage: { ...binding, filter: { is_active: 0 } },
    };
    expect(
      buildReadPlans([FX_TAGS, otherFilter], FIXTURE_KEYS).plans,
    ).toHaveLength(2);
  });

  it('subfield columns are read from the element row; lookups and paths are deferred, not planned', () => {
    const { plans, deferred } = buildReadPlans(
      [FX_PARTNERS, FX_PATH_FIELD],
      FIXTURE_KEYS,
    );
    expect(plans).toHaveLength(1);
    expect(planColumns(plans[0])).toEqual([
      'partner_row_id',
      'result_id',
      'partner_id',
      'is_lead',
      'note',
    ]);
    expect(deferred).toEqual([
      {
        fieldKey: 'fx.partners',
        subfieldPath: ['partner_type'],
        kind: 'lookup',
      },
      { fieldKey: 'fx.deep', subfieldPath: [], kind: 'path' },
    ]);
  });

  it('a scalar field with subfields is planned like a list element: its value AND its subfield columns, from one row (R-7 amended)', () => {
    const column = buildReadPlans([FX_TERM], FIXTURE_KEYS);
    expect(column.plans[0].fields[0]).toMatchObject({
      fieldKey: 'fx.term',
      wrapped: true,
      columns: [{ subfieldKey: 'degree', column: 'term' }],
    });

    const relation = buildReadPlans([FX_TAG_WITH_NOTE], FIXTURE_KEYS);
    expect(relation.plans[0].fields[0]).toMatchObject({
      wrapped: true,
      columns: [{ subfieldKey: 'note', column: 'note' }],
      startColumns: ['tag_row_id'],
    });
    expect(planColumns(relation.plans[0])).toContain('note');
    expect(relation.deferred).toEqual([
      { fieldKey: 'fx.tag_with_note', subfieldPath: ['links'], kind: 'path' },
    ]);
    // a scalar field WITHOUT subfields stays a bare value
    expect(
      buildReadPlans([FX_TITLE], FIXTURE_KEYS).plans[0].fields[0],
    ).toMatchObject({ wrapped: false, columns: [] });
  });

  it('a relation filter becomes equality terms, a NULL becomes IS NULL, booleans become 1/0', () => {
    const { plans } = buildReadPlans([FX_LINK], FIXTURE_KEYS);
    expect((plans[0] as RelationReadPlan).filter).toEqual([
      { column: 'section_id', op: 'is_null' },
    ]);
    const { plans: p2 } = buildReadPlans([FX_PARTNERS], FIXTURE_KEYS);
    expect((p2[0] as RelationReadPlan).filter).toEqual([
      { column: 'is_active', op: 'eq', value: 1 },
      { column: 'role', op: 'eq', value: 2 },
    ]);
  });

  it('a column bound to a list type is rejected without naming a table or column', () => {
    const bad = { ...FX_TITLE, type: 'list' as const };
    expect(() => buildReadPlans([bad], FIXTURE_KEYS)).toThrow(
      'value reader: field fx.title reads a list from one column',
    );
  });
});

describe('planQuery / renderPlanSql: one parameterized statement', () => {
  it('binds result ids and filter values, never interpolates them', () => {
    const { plans } = buildReadPlans([FX_PARTNERS], FIXTURE_KEYS);
    const { sql, params } = renderPlanSql(planQuery(plans[0], [5, 9]));
    expect(sql).toBe(
      'SELECT `partner_row_id`, `result_id`, `partner_id`, `is_lead`, `note` FROM `fx_partner`' +
        ' WHERE `result_id` IN (?, ?) AND `is_active` = ? AND `role` = ? ORDER BY `partner_row_id` ASC',
    );
    expect(params).toEqual([5, 9, 1, 2]);
  });

  it('renders IS NULL without a parameter', () => {
    const { plans } = buildReadPlans([FX_LINK], FIXTURE_KEYS);
    const { sql, params } = renderPlanSql(planQuery(plans[0], [1]));
    expect(sql).toContain('`section_id` IS NULL');
    expect(params).toEqual([1]);
  });

  it('renders alternative keys as OR over the same values, on a qualified table, all bound', () => {
    const { sql, params } = renderPlanSql({
      schema: 'toc-db',
      table: 'fx_src',
      select: ['id'],
      where: [{ op: 'any_in', columns: ['a', 'b'], values: ['x', 7] }],
      orderBy: 'id',
    });
    expect(sql).toBe(
      'SELECT `id` FROM `toc-db`.`fx_src` WHERE (`a` IN (?, ?) OR `b` IN (?, ?)) ORDER BY `id` ASC',
    );
    expect(params).toEqual(['x', 7, 'x', 7]);
  });

  it('rejects a schema that is not a plain name without echoing it', () => {
    expect(() =>
      renderPlanSql({
        schema: 'db`; DROP',
        table: 'fx_src',
        select: ['id'],
        where: [],
        orderBy: 'id',
      }),
    ).toThrow(/^value reader: invalid identifier$/);
  });

  it('rejects an identifier that is not a plain name', () => {
    expect(() =>
      renderPlanSql({
        table: 'fx; DROP TABLE x',
        select: ['id'],
        where: [{ column: 'id', op: 'in', values: [1] }],
        orderBy: 'id',
      }),
    ).toThrow('value reader: invalid identifier');
  });
});

describe('the real catalog', () => {
  const keys = entityTableKeys();

  it('every top-level column and relation field plans without error; path and lookup fields are deferred', () => {
    const { plans, deferred } = buildReadPlans(CATALOG_FIELDS, keys);
    const planned = new Set<string>();
    for (const p of plans) {
      for (const f of p.fields) planned.add('fieldKey' in f ? f.fieldKey : '');
    }
    const deferredTop = new Set(
      deferred
        .filter((d) => d.subfieldPath.length === 0)
        .map((d) => d.fieldKey),
    );
    for (const f of CATALOG_FIELDS) {
      expect(planned.has(f.key) || deferredTop.has(f.key)).toBe(true);
    }
  });

  it('grouping is real: far fewer plans than bindings', () => {
    const { plans } = buildReadPlans(CATALOG_FIELDS, keys);
    const bindings = CATALOG_FIELDS.filter(
      (f) => f.storage.kind === 'column' || f.storage.kind === 'relation',
    ).length;
    expect(plans.length).toBeGreaterThan(0);
    expect(plans.length).toBeLessThan(bindings / 2);
  });
});
