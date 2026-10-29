// @akili-spec quality-assurance/qa-results-feed
// Test-only: a fixture catalog and an in-memory database for the value reader specs. No SQL parsing: the runner
// evaluates the `PlanQuery` predicates over fixture rows, so a mutated plan (a dropped filter, a missing column) shows.
import { CatalogField } from '../definitions/types';
import { PlanQuery, PlanQueryRunner, SqlRow } from './read-plan';
import { TableKeys } from './table-metadata';

const PRIMARY_KEYS: Record<string, string> = {
  fx_result: 'id',
  fx_type: 'fx_type_id',
  fx_tag: 'tag_row_id',
  fx_partner: 'partner_row_id',
  fx_link: 'link_row_id',
};
const RESULT_KEYS: Record<string, string> = {
  fx_result: 'id',
  fx_type: 'result_id',
};

export const FIXTURE_KEYS: TableKeys = {
  primaryKey: (table) => PRIMARY_KEYS[table],
  resultKey: (table) => RESULT_KEYS[table],
  temporal: (_table, column) => (column === 'due_on' ? 'date' : 'datetime'),
};

const base = {
  section: 'fx',
  order: 1,
  result_types: ['*'],
  required: false,
  required_confirmed: false,
  valid_from: 2026,
  valid_to: null,
};

export const col = (
  key: string,
  type: CatalogField['type'],
  table: string,
  column: string,
): CatalogField => ({
  ...base,
  key,
  label: key,
  type,
  storage: { kind: 'column', table, column },
});

const TAG_FILTER = { is_active: 1 };

export const FX_TITLE = col('fx.title', 'text', 'fx_result', 'title');
export const FX_OPEN = col('fx.is_open', 'boolean', 'fx_result', 'is_open');
export const FX_BUDGET = col('fx.budget', 'number', 'fx_result', 'budget');
export const FX_DUE = col('fx.due', 'date', 'fx_result', 'due_on');
export const FX_SCORE = col('fx.score', 'number', 'fx_type', 'score');

/** multi_select over the active tag rows; a row with a NULL `tag_id` is not an element. */
export const FX_TAGS: CatalogField = {
  ...base,
  key: 'fx.tags',
  label: 'tags',
  type: 'multi_select',
  storage: {
    kind: 'relation',
    table: 'fx_tag',
    fk_to_result: 'result_id',
    value_column: 'tag_id',
    filter: TAG_FILTER,
  },
};

/** single_select over the SAME table, foreign key and filter as FX_TAGS (one plan), another value column. */
export const FX_PRIMARY_TAG: CatalogField = {
  ...base,
  key: 'fx.primary_tag',
  label: 'primary tag',
  type: 'single_select',
  storage: {
    kind: 'relation',
    table: 'fx_tag',
    fk_to_result: 'result_id',
    value_column: 'primary_id',
    filter: TAG_FILTER,
  },
};

/** list of partners: filter on two columns; subfields are column reads of the element row plus a lookup (deferred). */
export const FX_PARTNERS: CatalogField = {
  ...base,
  key: 'fx.partners',
  label: 'partners',
  type: 'list',
  storage: {
    kind: 'relation',
    table: 'fx_partner',
    fk_to_result: 'result_id',
    value_column: 'partner_id',
    filter: { is_active: 1, role: 2 },
  },
  subfields: [
    {
      key: 'partner',
      label: 'partner',
      type: 'single_select',
      storage: { kind: 'column', table: 'fx_partner', column: 'partner_id' },
    },
    {
      key: 'is_lead',
      label: 'is lead',
      type: 'boolean',
      storage: { kind: 'column', table: 'fx_partner', column: 'is_lead' },
    },
    {
      key: 'note',
      label: 'note',
      type: 'text',
      storage: { kind: 'column', table: 'fx_partner', column: 'note' },
    },
    {
      key: 'partner_type',
      label: 'partner type',
      type: 'single_select',
      storage: {
        kind: 'lookup',
        source: 'clarisa.institutions',
        keys: [{ from: 'partner', to: 'id' }],
        value_column: 'type_id',
      },
    },
  ],
};

/** text relation whose filter holds a NULL (`section_id IS NULL`). */
export const FX_LINK: CatalogField = {
  ...base,
  key: 'fx.link',
  label: 'link',
  type: 'text',
  storage: {
    kind: 'relation',
    table: 'fx_link',
    fk_to_result: 'result_id',
    value_column: 'url',
    filter: { section_id: null },
  },
};

/** A scalar (single_select) column field with one subfield over the SAME column: `{ value, degree }` (QRF-R-7, amended). */
export const FX_TERM: CatalogField = {
  ...col('fx.term', 'single_select', 'fx_type', 'term'),
  subfields: [
    {
      key: 'degree',
      label: 'degree',
      type: 'single_select',
      storage: { kind: 'column', table: 'fx_type', column: 'term' },
    },
  ],
};

/**
 * A scalar relation field with a column subfield and a path subfield that starts at the ELEMENT row (`from: tag_row_id`,
 * the table's primary key), as the real subfield paths do.
 */
export const FX_TAG_WITH_NOTE: CatalogField = {
  ...FX_PRIMARY_TAG,
  key: 'fx.tag_with_note',
  subfields: [
    {
      key: 'note',
      label: 'note',
      type: 'text',
      storage: { kind: 'column', table: 'fx_tag', column: 'note' },
    },
    {
      key: 'links',
      label: 'links',
      type: 'multi_select',
      storage: {
        kind: 'path',
        steps: [
          { table: 'fx_link', join: [{ from: 'tag_row_id', to: 'tag_ref' }] },
        ],
        value_column: 'url',
      },
    },
  ],
};

export const FX_PATH_FIELD: CatalogField = {
  ...base,
  key: 'fx.deep',
  label: 'deep',
  type: 'list',
  storage: {
    kind: 'path',
    steps: [{ table: 'fx_tag', join: [{ from: 'id', to: 'result_id' }] }],
    value_column: 'tag_id',
  },
};

export type FixtureDb = Record<string, SqlRow[]>;

export const FIXTURE_DB: FixtureDb = {
  fx_result: [
    {
      id: 1,
      title: 'One',
      is_open: 0,
      budget: '12.50',
      due_on: new Date(2026, 5, 30),
    },
    { id: 2, title: null, is_open: 1, budget: null, due_on: null },
  ],
  fx_type: [
    // two rows for result 1: the lowest primary key is the one read
    { fx_type_id: 7, result_id: 1, score: 9 },
    { fx_type_id: 5, result_id: 1, score: 3 },
  ],
  fx_tag: [
    // result 1: one real tag (10), one row whose tag_id is NULL, one inactive row (fails the filter)
    { tag_row_id: 1, result_id: 1, is_active: 1, tag_id: 10, primary_id: null },
    { tag_row_id: 2, result_id: 1, is_active: 1, tag_id: null, primary_id: 11 },
    { tag_row_id: 3, result_id: 1, is_active: 0, tag_id: 12, primary_id: 12 },
    { tag_row_id: 5, result_id: 2, is_active: 1, tag_id: 20, primary_id: 20 },
  ],
  fx_partner: [
    {
      partner_row_id: 2,
      result_id: 1,
      is_active: 1,
      role: 2,
      partner_id: 200,
      is_lead: 1,
      note: 'b',
    },
    {
      partner_row_id: 1,
      result_id: 1,
      is_active: 1,
      role: 2,
      partner_id: 100,
      is_lead: 0,
      note: null,
    },
    {
      partner_row_id: 3,
      result_id: 1,
      is_active: 1,
      role: 3,
      partner_id: 300,
      is_lead: 1,
      note: 'wrong role',
    },
  ],
  fx_link: [
    {
      link_row_id: 1,
      result_id: 1,
      section_id: 4,
      url: 'https://other-section',
    },
    { link_row_id: 2, result_id: 1, section_id: null, url: 'https://workshop' },
  ],
};

function matches(row: SqlRow, query: PlanQuery): boolean {
  return query.where.every((p) => {
    switch (p.op) {
      case 'in':
        return p.values.includes(Number(row[p.column]));
      case 'any_in':
        return p.columns.some((c) =>
          p.values.map(String).includes(String(row[c])),
        );
      case 'eq':
        return row[p.column] === p.value;
      case 'is_null':
        return row[p.column] === null || row[p.column] === undefined;
    }
  });
}

export interface RecordingRunner extends PlanQueryRunner {
  readonly calls: PlanQuery[];
}

/** Runs a plan query over `db`: filters, orders by `orderBy`, and returns ONLY the selected columns. */
export function fixtureRunner(db: FixtureDb = FIXTURE_DB): RecordingRunner {
  const calls: PlanQuery[] = [];
  const run = (async (query: PlanQuery) => {
    calls.push(query);
    return (db[query.table] ?? [])
      .filter((row) => matches(row, query))
      .sort((a, b) => Number(a[query.orderBy]) - Number(b[query.orderBy]))
      .map((row) => Object.fromEntries(query.select.map((c) => [c, row[c]])));
  }) as RecordingRunner;
  Object.defineProperty(run, 'calls', { value: calls });
  return run;
}

/** What a failing statement says in a real driver: schema, table, database. It must never leave the reader. */
export const DRIVER_LEAK =
  "Table 'prdb_secret.fx_result' doesn't exist; Unknown database 'toc_secret_db'";

/** A runner over `db` whose statements on `table` fail with `DRIVER_LEAK`; the others run. */
export function failingOn(
  table: string,
  db: FixtureDb = FIXTURE_DB,
): PlanQueryRunner {
  const ok = fixtureRunner(db);
  return (query) =>
    query.table === table ? Promise.reject(new Error(DRIVER_LEAK)) : ok(query);
}
