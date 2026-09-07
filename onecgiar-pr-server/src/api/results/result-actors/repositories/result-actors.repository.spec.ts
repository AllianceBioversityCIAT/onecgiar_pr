import { DataSource, getMetadataArgsStorage } from 'typeorm';
import { ResultActorRepository } from './result-actors.repository';
import { ResultActor } from '../entities/result-actor.entity';

/**
 * P2-3568 — the phase-rollover guard for `result_actors`.
 *
 * The oracle is the ENTITY, read through TypeORM's decorator metadata singleton.
 * That is the whole point: the previous version of this file pinned
 * `expect(columns).toHaveLength(19)`, which stayed GREEN while
 * `age_disaggregation_not_available` and `youth_split_applied_by_system` (added to the
 * entity by 565d9cf10 + migration 1788443000000, 3 Sep 2026) were missing from every
 * replication list in the repository. A hard-coded length cannot fail when a column is
 * added to the entity — it asserts the list still equals 19, and it does.
 *
 * `getMetadataArgsStorage()` is populated by the decorators at import time, so no
 * DataSource, driver or database is needed. Do NOT use `DataSource.getMetadata()`:
 * `buildMetadatas()` is protected and needs a driver plus the whole related-entity graph.
 */

/** Column modes that never reach a database column. */
const NON_DB_MODES = new Set(['virtual', 'virtual-property']);

/**
 * The ONLY entity columns the roll-forward must not carry, each with a written reason.
 * 🛑 An allow-listed name is how a guard goes green while a defect is live, so nothing
 * lands here without a reason a reviewer can argue with.
 */
const NOT_REPLICATED: Record<string, string> = {
  result_actors_id:
    'AUTO_INCREMENT primary key — the phase copy is a new row, so the id is never carried across.',
  addressing_demands:
    'PENDING BUSINESS ANSWER (found 7 Sep 2026 while fixing P2-3568). Free text, live since ' +
    'migration 1727905760292 (Oct 2024): written by the Innovation Dev / Innovation Use forms, ' +
    'read by summary/innovation_dev.service.ts and innovation-use.service.ts, and required by ' +
    'the P22 green check (migrations/1761849861521-createValidtionP22.ts:515). It has NEVER been ' +
    'replicated. Unlike a section tick, this is a reportable VALUE — whether last phase text ' +
    'still stands is a business call, so it is escalated, not copied, exactly as P2-3292 ' +
    '(d246d9afe) decided for the same shape. Delete this entry the day the answer lands.',
};

/**
 * SELECT targets that are legitimately computed instead of copied from the source row,
 * each with its reason. Semantic exceptions with reasons — not a count.
 */
const ALIASED_BY_DESIGN: Record<string, string> = {
  created_date:
    'predeterminedDateValidation(config.predetermined_date) — now() when the caller leaves it unset.',
  created_by:
    '${config.user.id} — the copy is authored by whoever ran the rollover, not by the original reporter.',
  last_updated_by: '${config.user.id} — same reason as created_by.',
  result_id:
    '${config.new_result_id} AS result_id — this is what points the copy at the new phase result.',
};

const normalize = (sql: string) => sql.replace(/\s+/g, ' ').trim();

/** Every distinct database column name the ResultActor entity declares. */
const persistedColumnNames = (): string[] => {
  const store = getMetadataArgsStorage();
  // The `instanceof` walk is what picks up BaseEntity's is_active / created_date /
  // last_updated_date / created_by / last_updated_by, whose target is the base class.
  const owns = (t: unknown) =>
    t === ResultActor ||
    (typeof t === 'function' &&
      ResultActor.prototype instanceof (t as new () => unknown));

  const fromColumns = store.columns
    .filter((c) => owns(c.target))
    .filter((c) => !NON_DB_MODES.has(c.mode as string))
    .map(
      (c) =>
        (c.options as { name?: string })?.name ?? (c.propertyName as string),
    );

  // section_id, result_id and actor_type_id are ALSO declared as @JoinColumn on the
  // object relations. Scanning joinColumns is not optional (a column can exist only
  // there), and the Set dedupe is not optional either.
  const fromJoins = store.joinColumns
    .filter((c) => owns(c.target))
    .map((c) => c.name ?? (c.propertyName as string));

  return [...new Set([...fromColumns, ...fromJoins])];
};

/** Comma split at parenthesis depth 0 only — `now()` and any subquery stay in one piece. */
const splitTopLevel = (list: string): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of list) {
    if (char === '(') depth++;
    if (char === ')') depth--;
    if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim().length) parts.push(current.trim());
  return parts;
};

/** Depth-counting scan to the paren matching the one at `openIndex`. Never a regex. */
const matchingParen = (sql: string, openIndex: number): number => {
  let depth = 0;
  for (let i = openIndex; i < sql.length; i++) {
    if (sql[i] === '(') depth++;
    if (sql[i] === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  throw new Error('unbalanced parentheses in the query — parser is stale');
};

/**
 * Index of the FIRST ` from ` at depth 0. FIRST, not LAST: a subquery's own `from` sits
 * inside parentheses, and this stays correct if one is ever added to the WHERE clause.
 */
const firstTopLevelFrom = (body: string): number => {
  let depth = 0;
  for (let i = 0; i < body.length; i++) {
    if (body[i] === '(') depth++;
    if (body[i] === ')') depth--;
    if (depth === 0 && body.slice(i, i + 6).toLowerCase() === ' from ')
      return i;
  }
  throw new Error('no top-level FROM in the SELECT half — parser is stale');
};

/** The column an expression LANDS IN: its depth-0 alias, else the tail after the last dot. */
const targetColumn = (expr: string): string => {
  let depth = 0;
  let aliasAt = -1;
  for (let i = 0; i < expr.length; i++) {
    if (expr[i] === '(') depth++;
    if (expr[i] === ')') depth--;
    if (depth === 0 && expr.slice(i, i + 4).toLowerCase() === ' as ')
      aliasAt = i;
  }
  const tail = aliasAt >= 0 ? expr.slice(aliasAt + 4) : expr;
  const afterDot = tail.slice(tail.lastIndexOf('.') + 1);
  return afterDot.replace(/`/g, '').trim().toLowerCase();
};

const insertHalves = (insertQuery: string) => {
  const sql = normalize(insertQuery);
  // `\s*\(` keeps this off any other table whose name merely starts the same way.
  const head = /insert\s+into\s+`?result_actors`?\s*\(/i.exec(sql);
  if (!head)
    throw new Error('no INSERT INTO result_actors ( — parser is stale');

  const openIndex = sql.indexOf('(', head.index);
  const closeIndex = matchingParen(sql, openIndex);
  const columns = splitTopLevel(sql.slice(openIndex + 1, closeIndex)).map((c) =>
    c.replace(/`/g, '').trim().toLowerCase(),
  );

  const afterColumns = sql.slice(closeIndex + 1);
  const selectAt = afterColumns.toLowerCase().indexOf('select');
  if (selectAt < 0)
    throw new Error('no SELECT after the column list — parser is stale');

  const body = afterColumns.slice(selectAt + 'select'.length);
  const selectExprs = splitTopLevel(body.slice(0, firstTopLevelFrom(body)));

  return { columns, selectExprs, selectNames: selectExprs.map(targetColumn) };
};

const findQueryTargets = (findQuery: string): string[] => {
  const sql = normalize(findQuery);
  const selectAt = sql.toLowerCase().indexOf('select');
  if (selectAt < 0) throw new Error('no SELECT in findQuery — parser is stale');
  const body = sql.slice(selectAt + 'select'.length);
  return splitTopLevel(body.slice(0, firstTopLevelFrom(body))).map(
    targetColumn,
  );
};

const replicableColumns = () =>
  persistedColumnNames().filter((c) => !(c in NOT_REPLICATED));

describe('ResultActorRepository (unit)', () => {
  let repo: ResultActorRepository;

  const mockDataSource = {
    createEntityManager: jest.fn(() => ({}) as any),
    query: jest.fn(),
  } as unknown as DataSource;

  const mockHandlersError = {
    returnErrorRepository: jest.fn((e) => e),
  } as any;

  // `predetermined_date` deliberately left unset: predeterminedDateValidation then emits
  // `now()`, so the quote-unaware depth parser never meets a quoted literal.
  const config = {
    phase: 5,
    user: { id: 77 },
    old_result_id: 1000,
    new_result_id: 2000,
  } as any;

  beforeEach(() => {
    (mockDataSource.createEntityManager as any).mockClear?.();
    (mockDataSource.query as any).mockClear?.();
    repo = new ResultActorRepository(mockDataSource, mockHandlersError);
  });

  it('constructs repository', () => {
    expect(repo).toBeDefined();
  });

  describe('guard controls', () => {
    it('reads real column metadata off the ResultActor entity', () => {
      const persisted = persistedColumnNames();

      // The fence catches ResultActor being imported through two module paths (two
      // distinct class objects), which would silently shrink the expected set to nothing.
      expect(persisted.length).toBeGreaterThanOrEqual(20);
      expect(persisted).toEqual(
        expect.arrayContaining([
          'result_actors_id',
          'is_active',
          'created_date',
          'created_by',
          'last_updated_by',
          'result_id',
          'actor_type_id',
          'section_id',
          'women',
          'has_men_youth',
        ]),
      );
    });

    it('keeps NOT_REPLICATED and ALIASED_BY_DESIGN entries that still exist on the entity', () => {
      const persisted = persistedColumnNames();
      const declared = [
        ...Object.keys(NOT_REPLICATED),
        ...Object.keys(ALIASED_BY_DESIGN),
      ];

      expect(declared.filter((c) => !persisted.includes(c))).toEqual([]);
    });

    it('parses both halves of the INSERT it is guarding', () => {
      const { columns, selectExprs } = insertHalves(
        repo.createQueries(config).insertQuery,
      );

      expect(columns.length).toBeGreaterThanOrEqual(19);
      expect(selectExprs).toHaveLength(columns.length);
      expect(columns).toContain('women');
    });

    it('names each column exactly once', () => {
      const { columns } = insertHalves(repo.createQueries(config).insertQuery);

      // Without this, the by-name pairing below and the findQuery set compare are unsound.
      expect(new Set(columns).size).toBe(columns.length);
    });
  });

  describe('createQueries', () => {
    it('selects section_id in the findQuery', () => {
      const { findQuery } = repo.createQueries(config);

      expect(normalize(findQuery)).toContain('section_id');
    });

    it('names section_id in the INSERT column list', () => {
      const { insertQuery } = repo.createQueries(config);

      expect(insertHalves(insertQuery).columns).toContain('section_id');
    });

    it('selects section_id in the insertQuery SELECT half', () => {
      const { insertQuery } = repo.createQueries(config);

      expect(insertHalves(insertQuery).selectNames).toContain('section_id');
    });

    it('names every replicable entity column in the INSERT column list', () => {
      const expected = replicableColumns();
      const { columns } = insertHalves(repo.createQueries(config).insertQuery);

      // Reported as named arrays, never as a length: a length pin is what let
      // age_disaggregation_not_available and youth_split_applied_by_system ride along
      // unreplicated for four days.
      expect({
        missing: expected.filter((c) => !columns.includes(c)),
        extra: columns.filter((c) => !expected.includes(c)),
      }).toEqual({ missing: [], extra: [] });
    });

    it('selects every replicable entity column in the INSERT SELECT half', () => {
      const expected = replicableColumns();
      const { selectNames } = insertHalves(
        repo.createQueries(config).insertQuery,
      );

      expect({
        missing: expected.filter((c) => !selectNames.includes(c)),
        extra: selectNames.filter((c) => !expected.includes(c)),
      }).toEqual({ missing: [], extra: [] });
    });

    it('keeps the two halves aligned position by position', () => {
      const { columns, selectNames } = insertHalves(
        repo.createQueries(config).insertQuery,
      );

      // `INSERT INTO t (cols) SELECT exprs` binds BY POSITION, not by name. A name-set
      // match cannot catch a column inserted mid-list in one half only — MySQL would then
      // silently write booleans into actor_type_id and ids into flags, with no error.
      expect(selectNames).toEqual(columns);
    });

    it('copies every plain column as a bare source column', () => {
      const { columns, selectExprs } = insertHalves(
        repo.createQueries(config).insertQuery,
      );

      // Inverted on purpose: everything that is not a named, reasoned exception must be a
      // straight copy. A `_related`/`_by_system`-suffix loop would miss the next column
      // whose name follows neither convention.
      const wrapped = columns
        .map((column, index) => ({ column, expr: selectExprs[index] }))
        .filter(({ column }) => !(column in ALIASED_BY_DESIGN))
        .filter(({ column, expr }) => expr.toLowerCase() !== column);

      expect(wrapped).toEqual([]);
    });

    it('derives the audit columns from the rollover config, not from the source row', () => {
      const { columns, selectExprs } = insertHalves(
        repo.createQueries(config).insertQuery,
      );
      const exprFor = (column: string) =>
        selectExprs[columns.indexOf(column)].toLowerCase();

      // Proves config actually flows into the SQL, rather than merely that some
      // expression exists there.
      expect(exprFor('created_by')).toContain('77');
      expect(exprFor('last_updated_by')).toContain('77');
      expect(exprFor('result_id')).toContain('2000');
      expect(exprFor('created_date')).toContain('now()');

      // Control: with a predetermined date the same slot carries the literal instead.
      const dated = insertHalves(
        repo.createQueries({ ...config, predetermined_date: '2026-01-31' })
          .insertQuery,
      );
      expect(
        dated.selectExprs[dated.columns.indexOf('created_date')],
      ).toContain('2026-01-31');
    });

    it('exposes the same replicable column set in findQuery', () => {
      const { findQuery } = repo.createQueries(config);
      const targets = findQueryTargets(findQuery);

      // 🛑 SET compare, never ordered. findQuery is consumed NAME-based — the
      // custonFunction branch of replicable-repository.ts hands its rows to `this.save()`,
      // which maps by property name — so its internal order is cosmetic while its names
      // are load-bearing. In the sibling evidences repository the two blocks legitimately
      // differ in order, and an ordered assertion there is red on correct code forever.
      // findQuery is also DEAD today: `config.f?.custonFunction` is the only gate and
      // nothing in the server ever assigns it. Pinned so the halves cannot drift, never
      // described as a live path.
      expect({
        missing: replicableColumns().filter((c) => !targets.includes(c)),
        extra: targets.filter((c) => !replicableColumns().includes(c)),
      }).toEqual({ missing: [], extra: [] });
    });

    it('keeps the existing replication scope untouched', () => {
      const { findQuery, insertQuery } = repo.createQueries(config);

      for (const sql of [normalize(findQuery), normalize(insertQuery)]) {
        expect(sql).toContain('2000 AS result_id');
        expect(sql).toContain('result_id = 1000');
        expect(sql).toContain('AND is_active > 0');
      }
    });

    it('returns the new rows through returnQuery', () => {
      const { returnQuery } = repo.createQueries(config);
      const sql = normalize(returnQuery);

      expect(sql).toContain('result_actors_id');
      expect(sql).toContain('result_id = 2000');
    });
  });

  // LAST in the file and fully synchronous: it mutates a globalThis singleton.
  describe('red-ability', () => {
    it('can go red: a column added to the entity and not to the query is reported missing', () => {
      const storage = getMetadataArgsStorage();
      storage.columns.push({
        target: ResultActor,
        propertyName: 'zz_guard_probe_flag',
        mode: 'regular',
        options: { name: 'zz_guard_probe_flag' },
      } as any);

      try {
        const expected = replicableColumns();
        const { columns, selectNames } = insertHalves(
          repo.createQueries(config).insertQuery,
        );

        expect(expected.filter((c) => !columns.includes(c))).toContain(
          'zz_guard_probe_flag',
        );
        expect(expected.filter((c) => !selectNames.includes(c))).toContain(
          'zz_guard_probe_flag',
        );
        // …while the length pin this file used to carry stays perfectly GREEN on the very
        // same mutation. That contrast is the reason the pin was replaced.
        expect(selectNames).toHaveLength(columns.length);
      } finally {
        storage.columns.pop();
      }

      expect(persistedColumnNames()).not.toContain('zz_guard_probe_flag');
    });
  });
});
