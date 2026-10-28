// @akili-spec quality-assurance/qa-results-feed
// QRF-T-3, first step: P-14. Every table a `relation` or `path` binding reads has a single-column primary key,
// so a list element can be keyed by it (QRF-DD-7) and subfields attach to the right element.
import { CATALOG_FIELDS } from '../definitions/sections';
import {
  CatalogField,
  CatalogSubField,
  StorageBinding,
  SubFieldStorageBinding,
} from '../definitions/types';
import {
  RESULT_KEY_COLUMN,
  columnNamesByTable,
  primaryKeyColumnsByTable,
} from './table-metadata';

type Bound = StorageBinding | SubFieldStorageBinding;

function walk(
  fields: Array<CatalogField | CatalogSubField>,
  visit: (binding: Bound, depth: number) => void,
  depth = 0,
): void {
  for (const f of fields) {
    visit(f.storage, depth);
    if (f.subfields) walk(f.subfields, visit, depth + 1);
  }
}

/** Tables a relation reads (all are elements) and every table a path walks through. */
function relationAndPathTables(): { relation: Set<string>; path: Set<string> } {
  const relation = new Set<string>();
  const path = new Set<string>();
  walk(CATALOG_FIELDS, (b) => {
    if (b.kind === 'relation') relation.add(b.table);
    if (b.kind === 'path') b.steps.forEach((s) => path.add(s.table));
  });
  return { relation, path };
}

describe('P-14: element tables have a single-column primary key', () => {
  const pks = primaryKeyColumnsByTable();
  const { relation, path } = relationAndPathTables();
  const all = [...new Set([...relation, ...path])].sort();

  it('the catalog binds relation and path tables at all (guards an empty walk)', () => {
    expect(relation.size).toBeGreaterThan(10);
    expect(path.size).toBeGreaterThan(10);
  });

  it.each(all)(
    '%s is a scope entity with exactly one primary-key column',
    (table) => {
      expect(pks.has(table)).toBe(true);
      expect(pks.get(table)).toHaveLength(1);
    },
  );
});

describe('result key registry', () => {
  it('every top-level column binding table has a result key', () => {
    const tables = new Set(
      CATALOG_FIELDS.filter((f) => f.storage.kind === 'column').map(
        (f) => (f.storage as { table: string }).table,
      ),
    );
    for (const table of tables) {
      expect(RESULT_KEY_COLUMN[table]).toBeDefined();
    }
  });

  it('every registered result key is a column of its entity', () => {
    const columns = columnNamesByTable();
    for (const [table, key] of Object.entries(RESULT_KEY_COLUMN)) {
      expect(columns.get(table)?.has(key)).toBe(true);
    }
  });
});
