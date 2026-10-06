// @akili-spec quality-assurance/qa-field-catalog
// QAC-R-7 completeness guard. The real-scope test and every fixture case call the SAME function
// (checkCompleteness); fixtures differ only in the metadata view and inputs they pass.
import * as fs from 'fs';
import * as path from 'path';
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  getMetadataArgsStorage,
} from 'typeorm';
import { Auditable } from '../../shared/entities/auditableEntity';
import {
  MetadataView,
  RESULT_TABLE_PATTERN,
  checkCompleteness,
  tableName,
} from './definitions/completeness';
import { EXCLUDED_TABLES } from './definitions/excluded-tables';
import { NOT_FOR_QA } from './definitions/not-for-qa';
import { PENDING_CATALOG } from './definitions/pending-catalog';
import { CATALOG_SCOPE, EntityClass } from './definitions/scope';
import { CATALOG_FIELDS } from './definitions/sections';
import { CatalogField } from './definitions/types';

// ---- Real entities: same roots as src/config/orm.config.ts ------------------------------------
const SRC = path.resolve(__dirname, '../..');
const ENTITY_ROOTS = ['api', 'auth', 'clarisa', 'toc', 'result-dashboard-bi'];

function entityFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const full = path.join(dir, d.name);
    if (d.isDirectory()) return entityFiles(full);
    return d.name.endsWith('.entity.ts') ? [full] : [];
  });
}

// ---- Fixtures (test-only). Declared AFTER real entities are loaded; filtered out of the real view.
@Entity('fixture_table')
class FixtureEntity extends Auditable {
  @PrimaryGeneratedColumn({ name: 'id' }) id: number;
  @Column({ name: 'foo_bar', nullable: true }) foo_bar: string;
}

@Entity('results_fixture')
class ResultsFixtureEntity {
  @PrimaryGeneratedColumn({ name: 'id' }) id: number;
}

const FIXTURES: unknown[] = [FixtureEntity, ResultsFixtureEntity];

function view(include: (target: unknown) => boolean): MetadataView {
  const s = getMetadataArgsStorage();
  return {
    tables: s.tables.filter((t) => include(t.target)),
    columns: s.columns.filter((c) => include(c.target)),
    joinColumns: s.joinColumns.filter((j) => include(j.target)),
  };
}
// Real view: everything registered except the fixtures above and the Auditable base is irrelevant
// (base columns are reached through the prototype chain, never as tables).
const realView = (): MetadataView => view((t) => !FIXTURES.includes(t));
// Fixture view: fixtures plus the bases they inherit from (columns on Auditable are registered on it).
const fixtureView = (): MetadataView =>
  view((t) => FIXTURES.includes(t) || t === Auditable);

const col = (table: string, column: string): CatalogField =>
  ({
    key: `k_${column}`,
    storage: { kind: 'column', table, column },
  }) as unknown as CatalogField;

const bindAll = (...cols: string[]): CatalogField[] =>
  cols.map((c) => col('fixture_table', c));
const audit = (reason = 'audit') =>
  ['created_at', 'updated_at', 'updated_by'].map((column) => ({
    table: 'fixture_table',
    column,
    reason,
  }));

const run = (over: Partial<Parameters<typeof checkCompleteness>[0]>) =>
  checkCompleteness({
    metadata: fixtureView(),
    scope: [FixtureEntity],
    excluded: [{ table: 'results_fixture', reason: 'fixture' }],
    fields: [],
    notForQa: [],
    pending: [],
    ...over,
  });

describe('QAC-R-7 completeness guard — real scope', () => {
  beforeAll(() => {
    for (const root of ENTITY_ROOTS) {
      for (const file of entityFiles(path.join(SRC, root))) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports -- registers entity metadata
        require(file);
      }
    }
  });

  it('registers the result tables it is supposed to police (guards against loading no entities)', () => {
    const names = realView().tables.map(tableName);
    expect(
      names.filter((n) => RESULT_TABLE_PATTERN.test(n)).length,
    ).toBeGreaterThan(20);
    expect(names).toContain('result');
  });

  it('passes on the real scope, catalog, excluded list and NOT_FOR_QA', () => {
    const failures = checkCompleteness({
      metadata: realView(),
      scope: CATALOG_SCOPE as EntityClass[],
      excluded: EXCLUDED_TABLES,
      fields: CATALOG_FIELDS,
      notForQa: NOT_FOR_QA,
      pending: PENDING_CATALOG,
    });
    expect(failures).toEqual([]);
  });
});

describe('QAC-R-7 completeness guard — fixtures through the same function', () => {
  it('fails naming <table>.<column> for an uncatalogued own column', () => {
    const failures = run({ fields: bindAll('id'), notForQa: audit() });
    expect(failures.join('\n')).toContain('fixture_table.foo_bar');
  });

  it('passes once the column is bound to a field', () => {
    expect(
      run({ fields: bindAll('id', 'foo_bar'), notForQa: audit() }),
    ).toEqual([]);
  });

  it('passes once the column is listed in NOT_FOR_QA with a reason', () => {
    const notForQa = [
      ...audit(),
      { table: 'fixture_table', column: 'foo_bar', reason: 'internal' },
    ];
    expect(run({ fields: bindAll('id'), notForQa })).toEqual([]);
  });

  it('DD-11: passes once the column is listed in PENDING_CATALOG with a reason (subtracted, not hidden)', () => {
    const pending = [
      {
        table: 'fixture_table',
        column: 'foo_bar',
        reason: 'optional — stage 2',
      },
    ];
    expect(run({ fields: bindAll('id'), notForQa: audit(), pending })).toEqual(
      [],
    );
    // control: the same input without the pending entry is red and names the column
    expect(
      run({ fields: bindAll('id'), notForQa: audit() }).join('\n'),
    ).toContain('fixture_table.foo_bar');
  });

  it('DD-11: fails on a stale PENDING_CATALOG entry and on an empty reason', () => {
    const base = { fields: bindAll('id', 'foo_bar'), notForQa: audit() };
    const stale = run({
      ...base,
      pending: [{ table: 'fixture_table', column: 'ghost', reason: 'x' }],
    });
    expect(stale.join('\n')).toContain(
      'stale PENDING_CATALOG: fixture_table.ghost',
    );
    const noTable = run({
      ...base,
      pending: [{ table: 'no_such_table', column: 'a', reason: 'x' }],
    });
    expect(noTable.join('\n')).toContain('no_such_table');
    const empty = run({
      ...base,
      pending: [{ table: 'fixture_table', column: 'foo_bar', reason: ' ' }],
    });
    expect(empty.join('\n')).toContain(
      'PENDING_CATALOG fixture_table.foo_bar has an empty reason',
    );
  });

  it('DD-11: a column cannot be both PENDING_CATALOG and NOT_FOR_QA; pending on a bound column is allowed', () => {
    const both = run({
      fields: bindAll('id', 'foo_bar'),
      notForQa: [
        ...audit(),
        { table: 'fixture_table', column: 'foo_bar', reason: 'internal' },
      ],
      pending: [{ table: 'fixture_table', column: 'foo_bar', reason: 'later' }],
    });
    expect(both.join('\n')).toContain(
      'fixture_table.foo_bar is both PENDING_CATALOG and NOT_FOR_QA',
    );
    expect(
      run({
        fields: bindAll('id', 'foo_bar'),
        notForQa: audit(),
        pending: [
          {
            table: 'fixture_table',
            column: 'foo_bar',
            reason: 'shared column',
          },
        ],
      }),
    ).toEqual([]);
  });

  it('detects a column inherited from the base class (prototype-chain walk)', () => {
    const notForQa = audit().filter((e) => e.column !== 'updated_by');
    const failures = run({ fields: bindAll('id', 'foo_bar'), notForQa });
    expect(failures.join('\n')).toContain('fixture_table.updated_by');
  });

  it('fails on a binding naming a column that does not exist (stale)', () => {
    const failures = run({
      fields: bindAll('id', 'foo_bar', 'ghost'),
      notForQa: audit(),
    });
    const text = failures.join('\n');
    expect(text).toContain('stale');
    expect(text).toContain('fixture_table.ghost');
  });

  it('fails on a stale NOT_FOR_QA entry and on an empty reason', () => {
    const stale = run({
      fields: bindAll('id', 'foo_bar'),
      notForQa: [
        ...audit(),
        { table: 'fixture_table', column: 'ghost', reason: 'x' },
      ],
    });
    expect(stale.join('\n')).toContain('stale NOT_FOR_QA: fixture_table.ghost');
    const empty = run({
      fields: bindAll('id', 'foo_bar'),
      notForQa: audit().map((e) =>
        e.column === 'created_at' ? { ...e, reason: ' ' } : e,
      ),
    });
    expect(empty.join('\n')).toContain(
      'NOT_FOR_QA fixture_table.created_at has an empty reason',
    );
  });

  it('counts relation fk_to_result, value_column and filter columns as covered', () => {
    const relation = {
      key: 'rel',
      storage: {
        kind: 'relation',
        table: 'fixture_table',
        fk_to_result: 'id',
        value_column: 'foo_bar',
        filter: { created_at: 1 },
      },
    } as unknown as CatalogField;
    const notForQa = audit().filter((e) => e.column !== 'created_at');
    expect(run({ fields: [relation], notForQa })).toEqual([]);
  });

  it('fails for a results?_ entity that is neither in scope nor excluded', () => {
    const failures = run({
      excluded: [],
      fields: bindAll('id', 'foo_bar'),
      notForQa: audit(),
    });
    expect(failures.join('\n')).toContain('results_fixture');
  });

  it('fails for an excluded entry with no reason or no matching table', () => {
    const noReason = run({
      excluded: [{ table: 'results_fixture', reason: '' }],
      fields: bindAll('id', 'foo_bar'),
      notForQa: audit(),
    });
    expect(noReason.join('\n')).toContain(
      'excluded table results_fixture has an empty reason',
    );
    const stale = run({
      excluded: [
        { table: 'results_fixture', reason: 'fixture' },
        { table: 'results_gone', reason: 'x' },
      ],
      fields: bindAll('id', 'foo_bar'),
      notForQa: audit(),
    });
    expect(stale.join('\n')).toContain(
      'stale excluded entry: table results_gone',
    );
  });
});
