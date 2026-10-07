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

// QAC-T-14: stands in for `result` so a path binding's first join column (a column of `result`) can be checked.
@Entity('result')
class ResultAnchorEntity {
  @PrimaryGeneratedColumn({ name: 'id' }) id: number;
}

// QAC-T-14 (DD-13): a child table of `fixture_table`, so a subfield path can start from its parent's row.
@Entity('child_fixture')
class ChildFixtureEntity {
  @PrimaryGeneratedColumn({ name: 'id' }) id: number;
  @Column({ name: 'parent_id', nullable: true }) parent_id: number;
  @Column({ name: 'label', nullable: true }) label: string;
}

const FIXTURES: unknown[] = [FixtureEntity, ResultsFixtureEntity];
const NOT_REAL: unknown[] = [
  ...FIXTURES,
  ResultAnchorEntity,
  ChildFixtureEntity,
];

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
const realView = (): MetadataView => view((t) => !NOT_REAL.includes(t));
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

describe('QAC-T-14 completeness guard — path and lookup bindings, nested subfields (DD-13)', () => {
  const pathView = (): MetadataView =>
    view(
      (t) =>
        t === FixtureEntity ||
        t === ResultAnchorEntity ||
        t === ChildFixtureEntity ||
        t === Auditable,
    );
  const runPath = (over: Partial<Parameters<typeof checkCompleteness>[0]>) =>
    checkCompleteness({
      metadata: pathView(),
      scope: [ResultAnchorEntity, FixtureEntity],
      excluded: [],
      fields: [],
      notForQa: [],
      pending: [],
      ...over,
    });
  const anchor = col('result', 'id');
  // One distinct column per role, so removing a role from the binding must surface exactly that column.
  const pathField = (
    over: Partial<{
      join_from: string;
      join_to: string;
      value_column: string;
      filter: Record<string, number>;
      columns: string[];
    }> = {},
  ): CatalogField => {
    const { value_column, columns, ...step } = over;
    return {
      key: 'p',
      storage: {
        kind: 'path',
        steps: [
          {
            table: 'fixture_table',
            join_from: 'id',
            join_to: 'id',
            filter: { created_at: 1 },
            ...step,
          },
        ],
        value_column: value_column ?? 'foo_bar',
        columns: columns ?? ['updated_at'],
      },
    } as unknown as CatalogField;
  };
  const onlyUpdatedBy = [
    { table: 'fixture_table', column: 'updated_by', reason: 'audit' },
  ];

  it('subtracts the join columns, value_column, filter keys and extra columns a path binding touches', () => {
    expect(runPath({ fields: [pathField()], notForQa: onlyUpdatedBy })).toEqual(
      [],
    );
  });

  it.each([
    ['join_to', { join_to: 'updated_by' }, 'fixture_table.id'],
    ['value_column', { value_column: 'id' }, 'fixture_table.foo_bar'],
    ['filter', { filter: {} }, 'fixture_table.created_at'],
    ['columns', { columns: [] }, 'fixture_table.updated_at'],
  ])(
    'a column the path no longer touches (%s) comes back as uncatalogued',
    (_role, over, expected) => {
      const failures = runPath({
        fields: [pathField(over)],
        notForQa: onlyUpdatedBy.filter((e) => e.column !== over['join_to']),
      });
      expect(failures.join('\n')).toContain(`uncatalogued column ${expected}`);
    },
  );

  it('the first step join_from is a column of `result`: a ghost one is stale, a real one is covered', () => {
    const failures = runPath({
      fields: [pathField({ join_from: 'ghost' }), anchor],
      notForQa: onlyUpdatedBy,
    });
    expect(failures.join('\n')).toContain('stale field p: result.ghost');
  });

  it('a later step joins from the previous step table', () => {
    const twoSteps = {
      key: 'p2',
      storage: {
        kind: 'path',
        steps: [
          { table: 'fixture_table', join_from: 'id', join_to: 'id' },
          { table: 'fixture_table', join_from: 'created_at', join_to: 'ghost' },
        ],
        value_column: 'foo_bar',
        columns: ['updated_at'],
      },
    } as unknown as CatalogField;
    const failures = runPath({
      fields: [twoSteps],
      notForQa: onlyUpdatedBy,
    });
    expect(failures.join('\n')).toContain(
      'stale field p2: fixture_table.ghost',
    );
    expect(failures.join('\n')).not.toContain('uncatalogued column');
  });

  it('fails when a path step table is not in scope (like a relation binding)', () => {
    const failures = runPath({
      scope: [ResultAnchorEntity],
      fields: [pathField(), anchor],
    });
    expect(failures.join('\n')).toContain(
      'field p names fixture_table.id but table fixture_table is not in scope.ts',
    );
  });

  it('ignores lookup bindings: no table check, and they cover no column', () => {
    const lookup = {
      key: 'l',
      storage: {
        kind: 'lookup',
        source: 'toc_not_a_table',
        key_from: 'ghost_column',
        value_column: 'statement',
      },
    } as unknown as CatalogField;
    const failures = runPath({
      fields: [lookup, anchor, col('fixture_table', 'id')],
      notForQa: [
        ...onlyUpdatedBy,
        { table: 'fixture_table', column: 'created_at', reason: 'audit' },
        { table: 'fixture_table', column: 'updated_at', reason: 'audit' },
      ],
    });
    // nothing stale about the lookup; only foo_bar (which the lookup does not cover) is reported
    expect(failures).toEqual([
      expect.stringContaining('uncatalogued column fixture_table.foo_bar'),
    ]);
  });

  it('counts the bindings of nested subfields (depth 2) and ignores lookup subfields', () => {
    const nested = {
      key: 'n',
      storage: { kind: 'column', table: 'fixture_table', column: 'id' },
      subfields: [
        {
          key: 'a',
          storage: {
            kind: 'column',
            table: 'fixture_table',
            column: 'foo_bar',
          },
          subfields: [
            {
              key: 'b',
              storage: {
                kind: 'column',
                table: 'fixture_table',
                column: 'created_at',
              },
            },
            {
              key: 'c',
              storage: {
                kind: 'lookup',
                source: 's',
                key_from: 'k',
                value_column: 'v',
              },
            },
          ],
        },
      ],
    } as unknown as CatalogField;
    const notForQa = onlyUpdatedBy.concat({
      table: 'fixture_table',
      column: 'updated_at',
      reason: 'audit',
    });
    expect(runPath({ fields: [nested, anchor], notForQa })).toEqual([]);
    // control: without the depth-2 column binding, created_at is reported
    const shallow = {
      ...nested,
      subfields: [{ ...nested['subfields'][0], subfields: [] }],
    } as unknown as CatalogField;
    expect(
      runPath({ fields: [shallow, anchor], notForQa }).join('\n'),
    ).toContain('uncatalogued column fixture_table.created_at');
  });
  // DD-13 (T-14 review): a subfield path starts from the PARENT element's row, not from `result`.
  const pathSub = (
    join_from: string,
    extra: Partial<{ columns: string[] }> = {},
  ) => ({
    kind: 'path',
    steps: [{ table: 'child_fixture', join_from, join_to: 'parent_id' }],
    value_column: 'label',
    columns: ['id'],
    ...extra,
  });
  const parentField = (subfield: unknown, parent = 'fixture_table') =>
    ({
      key: 'n',
      storage: { kind: 'column', table: parent, column: 'id' },
      subfields: [{ key: 's', ...(subfield as object) }],
    }) as unknown as CatalogField;
  const childScope = [ResultAnchorEntity, FixtureEntity, ChildFixtureEntity];
  const parentNotForQa = [
    ...onlyUpdatedBy,
    { table: 'fixture_table', column: 'created_at', reason: 'audit' },
    { table: 'fixture_table', column: 'updated_at', reason: 'audit' },
    { table: 'fixture_table', column: 'foo_bar', reason: 'audit' },
  ];

  it('DD-13: a subfield path first-step join_from is a column of the PARENT binding table (not of `result`)', () => {
    // `foo_bar` exists on fixture_table and not on result: read from `result` it would be stale.
    expect(
      runPath({
        scope: childScope,
        fields: [parentField({ storage: pathSub('foo_bar') }), anchor],
        notForQa: parentNotForQa.filter((n) => n.column !== 'foo_bar'),
      }),
    ).toEqual([]);
  });

  it('DD-13: a ghost join_from on a subfield path is stale against the parent table, not `result`', () => {
    const failures = runPath({
      scope: childScope,
      fields: [parentField({ storage: pathSub('ghost') }), anchor],
      notForQa: parentNotForQa,
    });
    expect(failures).toEqual([
      'stale subfield n.s: fixture_table.ghost does not exist',
    ]);
  });

  it('DD-13: a depth-2 path joins from its depth-1 parent path last table; the parent table must be in scope', () => {
    const grandchild = {
      kind: 'path',
      steps: [
        { table: 'fixture_table', join_from: 'parent_id', join_to: 'id' },
      ],
      value_column: 'foo_bar',
    };
    const nested = {
      key: 'n',
      storage: { kind: 'column', table: 'fixture_table', column: 'id' },
      subfields: [
        {
          key: 'a',
          storage: pathSub('id'),
          subfields: [{ key: 'b', storage: grandchild }],
        },
      ],
    } as unknown as CatalogField;
    // parent_id is a column of child_fixture (the depth-1 path's last table); read from `result` it would be stale
    const notForQa = parentNotForQa.filter((n) => n.column !== 'foo_bar');
    expect(
      runPath({ scope: childScope, fields: [nested, anchor], notForQa }),
    ).toEqual([]);
    // control: a column that is on fixture_table only is stale when the depth-2 path joins from child_fixture
    const wrong = JSON.parse(JSON.stringify(nested));
    wrong.subfields[0].subfields[0].storage.steps[0].join_from = 'foo_bar';
    expect(
      runPath({ scope: childScope, fields: [wrong, anchor], notForQa }),
    ).toEqual(['stale subfield n.a.b: child_fixture.foo_bar does not exist']);
    // the parent table must be in scope
    expect(
      runPath({
        scope: [ResultAnchorEntity, FixtureEntity],
        fields: [nested, anchor],
        notForQa,
      }).join('\n'),
    ).toContain('table child_fixture is not in scope.ts');
  });

  it('DD-13: a subfield path under a top-level path binding joins from that path last table', () => {
    const top = {
      key: 'n',
      storage: {
        kind: 'path',
        steps: [{ table: 'fixture_table', join_from: 'id', join_to: 'id' }],
        value_column: 'id',
      },
      subfields: [{ key: 's', storage: pathSub('foo_bar') }],
    } as unknown as CatalogField;
    expect(
      runPath({
        scope: childScope,
        fields: [top, anchor],
        notForQa: parentNotForQa.filter((n) => n.column !== 'foo_bar'),
      }),
    ).toEqual([]);
  });
});
