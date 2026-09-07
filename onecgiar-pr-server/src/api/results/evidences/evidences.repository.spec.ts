import { DataSource, getMetadataArgsStorage } from 'typeorm';
import { EvidencesRepository } from './evidences.repository';
import { Evidence } from './entities/evidence.entity';

/**
 * P2-3568 — parity guard for the phase-rollover replication of `evidence`.
 *
 * The oracle is the Evidence ENTITY, read through TypeORM's decorator metadata
 * singleton (`getMetadataArgsStorage()`), which the `@Column` / `@JoinColumn` /
 * `@CreateDateColumn` / `@UpdateDateColumn` decorators populate at IMPORT time.
 * No DataSource, no driver, no MySQL, no `initialize()`.
 *
 * Why not a hard-coded length pin: `result-actors.repository.spec.ts:75-76`
 * asserts `toHaveLength(19)` and is GREEN today while the very same defect is
 * LIVE in the repository it pins (`result-actor.entity.ts` declares
 * `age_disaggregation_not_available` and `youth_split_applied_by_system`;
 * neither appears in `result-actors.repository.ts`). A number cannot fail when
 * a column is added to the ENTITY. This guard derives its expected set from the
 * entity, so it can.
 */
describe('EvidencesRepository.createQueries (entity parity guard)', () => {
  let repo: EvidencesRepository;

  const mockDataSource = {
    createEntityManager: jest.fn(() => ({}) as any),
    query: jest.fn(),
  } as unknown as DataSource;

  const mockHandlersError = {
    returnErrorRepository: jest.fn((e) => e),
  } as any;

  // `predetermined_date` is deliberately UNSET: predeterminedDateValidation
  // then emits `now()` (versioning.utils.ts:43-46), so the quote-unaware depth
  // parser below never meets a quoted literal.
  const config = {
    phase: 5,
    user: { id: 77 },
    old_result_id: 1000,
    new_result_id: 2000,
  } as any;

  /** Column modes that never reach the database. */
  const NON_DB_MODES = new Set(['virtual', 'virtual-property']);

  /**
   * The ONLY entity columns the roll-forward must not carry, each with a
   * written reason. `innov_dev_user_demand` is deliberately NOT listed: it is a
   * section tag on a declared-but-unwired checkbox, and an allow-listed name is
   * exactly how this guard would go green again the day someone wires it up.
   */
  const NOT_REPLICATED: Record<string, string> = {
    id: 'AUTO_INCREMENT primary key — the phase copy is a new row; findQuery emits `null as id`',
  };

  /**
   * SELECT targets that are legitimately computed rather than a bare `e.<col>`.
   * Semantic exceptions with reasons, not a count.
   */
  const ALIASED_BY_DESIGN: Record<string, string> = {
    id: 'findQuery only — `null as id` so the copy gets a fresh AUTO_INCREMENT',
    creation_date: 'predeterminedDateValidation(...) → now() or a literal date',
    created_by: '${config.user.id} — the user performing the rollover',
    last_updated_by: '${config.user.id} — the user performing the rollover',
    result_id:
      '${config.new_result_id} as result_id — the copy belongs to the new result',
    knowledge_product_related:
      'FK to result.id, phase-remapped through VERSIONING.QUERY.Get_result_phases',
  };

  const normalize = (sql: string) => sql.replace(/\s+/g, ' ').trim();

  /** Every distinct database column name the Evidence entity declares. */
  const persistedColumnNames = (): string[] => {
    const store = getMetadataArgsStorage();
    const owns = (t: unknown) =>
      t === Evidence ||
      (typeof t === 'function' && Evidence.prototype instanceof (t as any));

    const fromColumns = store.columns
      .filter((c) => owns(c.target))
      .filter((c) => !NON_DB_MODES.has(c.mode as string))
      .map(
        (c) => (c.options as { name?: string })?.name ?? String(c.propertyName),
      );

    // MANDATORY: knowledge_product_related, created_by and last_updated_by
    // exist ONLY as @JoinColumn. A columns-only derivation misses all three.
    const fromJoinColumns = store.joinColumns
      .filter((c) => owns(c.target))
      .map((c) => c.name ?? String(c.propertyName));

    // MANDATORY dedupe: result_id and evidence_type_id are each declared TWICE
    // (plain @Column and again as @JoinColumn on the object relation).
    return [
      ...new Set(
        [...fromColumns, ...fromJoinColumns].map((n) => n.toLowerCase()),
      ),
    ];
  };

  /** Comma split at parenthesis DEPTH 0 only. */
  // NOT stylistic: VERSIONING.QUERY.Get_result_phases expands to
  // `IFNULL((select id from `result` r2 WHERE ... and r2.version_id = 5 LIMIT 1), e.knowledge_product_related)`,
  // whose comma sits at depth 1. Measured on the real query: naive split(',')
  // yields 18 pieces against 17 columns (a FALSE RED); depth-aware yields 17.
  const splitTopLevel = (list: string): string[] => {
    const parts: string[] = [];
    let depth = 0;
    let current = '';
    for (const ch of list) {
      if (ch === '(') {
        depth++;
        current += ch;
      } else if (ch === ')') {
        depth--;
        current += ch;
      } else if (ch === ',' && depth === 0) {
        parts.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    if (current.trim()) parts.push(current.trim());
    return parts;
  };

  /** Depth-counting scan to the matching `)`. Never a non-greedy regex. */
  const matchingParen = (sql: string, openIndex: number): number => {
    let depth = 0;
    for (let i = openIndex; i < sql.length; i++) {
      if (sql[i] === '(') depth++;
      else if (sql[i] === ')') {
        depth--;
        if (depth === 0) return i;
      }
    }
    throw new Error(
      'unbalanced parentheses in the INSERT column list — parser is stale',
    );
  };

  /**
   * Index of the FIRST ` from ` at depth 0. FIRST, not LAST: the phase-remap
   * wrapper carries its own `from` inside parentheses, and FIRST stays correct
   * if a subquery is ever added to the WHERE clause.
   */
  const firstTopLevelFrom = (body: string): number => {
    const lower = body.toLowerCase();
    let depth = 0;
    for (let i = 0; i < lower.length; i++) {
      const ch = lower[i];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      else if (depth === 0 && lower.startsWith(' from ', i)) return i;
    }
    throw new Error(
      'no top-level FROM found in the SELECT half — parser is stale',
    );
  };

  /** The column an expression LANDS IN: last depth-0 ` as `, else the tail after the last dot. */
  const targetColumn = (expr: string): string => {
    const lower = expr.trim().toLowerCase();
    let depth = 0;
    let lastAs = -1;
    for (let i = 0; i < lower.length; i++) {
      const ch = lower[i];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      else if (depth === 0 && lower.startsWith(' as ', i)) lastAs = i;
    }
    const tail =
      lastAs >= 0
        ? lower.slice(lastAs + 4)
        : lower.slice(lower.lastIndexOf('.') + 1);
    return tail.replace(/`/g, '').trim();
  };

  const insertHalves = (insertQuery: string) => {
    const sql = normalize(insertQuery);
    // `\s*\(` is what keeps this off `insert into evidence_sharepoint (`.
    const head = /insert\s+into\s+`?evidence`?\s*\(/i.exec(sql);
    if (!head)
      throw new Error(
        'no `insert into evidence (` found in insertQuery — parser is stale',
      );
    const openIndex = head.index + head[0].length - 1;
    const closeIndex = matchingParen(sql, openIndex);
    const columns = splitTopLevel(sql.slice(openIndex + 1, closeIndex)).map(
      (c) => c.replace(/`/g, '').trim().toLowerCase(),
    );

    const after = sql.slice(closeIndex + 1);
    const select = /^\s*select\s/i.exec(after);
    if (!select)
      throw new Error(
        'no SELECT after the INSERT column list — parser is stale',
      );
    const body = after.slice(select[0].length);
    const selectExprs = splitTopLevel(body.slice(0, firstTopLevelFrom(body)));

    return {
      columns,
      selectExprs,
      selectNames: selectExprs.map(targetColumn),
    };
  };

  const findQueryTargets = (findQuery: string): string[] => {
    const sql = normalize(findQuery);
    const select = /^select\s/i.exec(sql);
    if (!select)
      throw new Error('findQuery does not start with SELECT — parser is stale');
    const body = sql.slice(select[0].length);
    return splitTopLevel(body.slice(0, firstTopLevelFrom(body))).map(
      targetColumn,
    );
  };

  const expectedColumns = () =>
    persistedColumnNames().filter((c) => !(c in NOT_REPLICATED));

  beforeEach(() => {
    (mockDataSource.createEntityManager as any).mockClear?.();
    (mockDataSource.query as any).mockClear?.();
    repo = new EvidencesRepository(mockDataSource, mockHandlersError);
  });

  // ──────────── CONTROLS — a guard fed an empty set passes everything ────────────

  it('C1 reads real column metadata off the Evidence entity', () => {
    const persisted = persistedColumnNames();

    // The fence against Evidence being imported through two module paths
    // (two distinct class objects → a silently shrunken expected set).
    expect(persisted.length).toBeGreaterThanOrEqual(20);
    expect(persisted).toEqual(
      expect.arrayContaining([
        'link',
        'result_id',
        'evidence_type_id',
        'is_active',
        'created_by',
        'last_updated_by',
        'knowledge_product_related',
      ]),
    );
  });

  it('C2 NOT_REPLICATED and ALIASED_BY_DESIGN entries still exist on the entity', () => {
    const persisted = persistedColumnNames();
    const declared = [
      ...new Set([
        ...Object.keys(NOT_REPLICATED),
        ...Object.keys(ALIASED_BY_DESIGN),
      ]),
    ];

    expect(declared.filter((c) => !persisted.includes(c))).toEqual([]);
  });

  it('C3 parses both halves of the INSERT it is guarding', () => {
    const { columns, selectExprs } = insertHalves(
      repo.createQueries(config).insertQuery,
    );

    expect(columns.length).toBeGreaterThanOrEqual(17);
    expect(selectExprs).toHaveLength(columns.length);
    expect(columns).toContain('description');
  });

  it('C4 names each column exactly once', () => {
    const { columns } = insertHalves(repo.createQueries(config).insertQuery);

    expect(new Set(columns).size).toBe(columns.length);
  });

  // ──────────── THE GUARD ────────────

  it('G1 names every replicable entity column in the INSERT column list', () => {
    const expected = expectedColumns();
    const { columns } = insertHalves(repo.createQueries(config).insertQuery);

    expect({
      missing: expected.filter((c) => !columns.includes(c)),
      extra: columns.filter((c) => !expected.includes(c)),
    }).toEqual({ missing: [], extra: [] });
  });

  it('G2 selects every replicable entity column in the INSERT SELECT half', () => {
    const expected = expectedColumns();
    const { selectNames } = insertHalves(
      repo.createQueries(config).insertQuery,
    );

    expect({
      missing: expected.filter((c) => !selectNames.includes(c)),
      extra: selectNames.filter((c) => !expected.includes(c)),
    }).toEqual({ missing: [], extra: [] });
  });

  it('G3 keeps the two halves aligned position by position', () => {
    const { columns, selectNames } = insertHalves(
      repo.createQueries(config).insertQuery,
    );

    // `insert into T (cols) select exprs` writes BY INDEX, not by name. A
    // name-set match cannot catch a column inserted mid-list in one half only —
    // which is the booleans-into-evidence_type_id corruption MySQL performs
    // silently, with no runtime error.
    expect(selectNames).toEqual(columns);
  });

  it('G4 phase-remaps knowledge_product_related through Get_result_phases', () => {
    const { columns, selectExprs } = insertHalves(
      repo.createQueries(config).insertQuery,
    );
    const expr = selectExprs[columns.indexOf('knowledge_product_related')];

    expect(expr).toMatch(/IFNULL\(\(select id from/i);
    // config.phase = 5 — proves the phase actually FLOWS into the remapper,
    // rather than a wrapper merely existing.
    expect(expr).toMatch(/r2\.version_id = 5/);
  });

  it('G5 copies every plain column as a bare e.<column>', () => {
    const { columns, selectExprs } = insertHalves(
      repo.createQueries(config).insertQuery,
    );

    // INVERTED on purpose: iterating `_related` names would miss
    // `innov_dev_user_demand`. Everything that is not a named semantic
    // exception must be a bare `e.<col>` — no wrapper, no constant, no swapped
    // source column.
    const offenders = columns
      .map((col, i) => ({ col, expr: selectExprs[i] ?? '<missing>' }))
      .filter(({ col }) => !(col in ALIASED_BY_DESIGN))
      .filter(({ col, expr }) => expr.toLowerCase() !== `e.${col}`);

    expect(offenders).toEqual([]);
  });

  it('G6 exposes the same column set in findQuery, id included', () => {
    const findTargets = findQueryTargets(repo.createQueries(config).findQuery);

    // 🛑 SET compare, NEVER ordered. findQuery's internal order legitimately
    // DIFFERS from the insert column list: findQuery is
    // `... gender_related, link, youth_related, nutrition_related, ...`
    // (evidences.repository.ts:36-43) while the insert list is
    // `... gender_related, nutrition_related, environmental_biodiversity_related,
    // poverty_related, link, youth_related` (:64-69). They are set-equal but the
    // first ordered mismatch is at index 8 (`link` vs `nutrition_related`), so an
    // ordered toEqual(['id', ...columns]) here would be RED on correct code forever.
    //
    // Order does not matter there because findQuery is consumed NAME-based:
    // replicable-repository.ts:52-56 runs it and hands the rows to `this.save()`,
    // which maps by property name.
    //
    // findQuery is DEAD today — reached only under `config.f?.custonFunction`
    // (replicable-repository.ts:51), declared optional at
    // shared/globalInterfaces/replicable.interface.ts:19 and assigned nowhere
    // server-wide. It is pinned only so the two halves cannot drift; it is NOT a
    // live path.
    expect(
      persistedColumnNames().filter((c) => !findTargets.includes(c)),
    ).toEqual([]);
    expect(findTargets[0]).toBe('id');
  });

  it('G7 keeps the existing replication scope untouched', () => {
    const { findQuery, insertQuery } = repo.createQueries(config);

    for (const sql of [normalize(findQuery), normalize(insertQuery)]) {
      expect(sql).toContain('2000 as result_id');
      expect(sql).toContain('e.result_id = 1000');
      expect(sql).toContain('and is_active > 0');
    }
  });

  // ──────────── RED-ABILITY META-TEST — keep LAST, fully synchronous ────────────

  it('M1 can go red: a column added to the entity and not to the query is reported missing', () => {
    // Mutates a globalThis singleton, hence: last in the file, no await
    // anywhere near it, `finally` non-negotiable.
    const storage = getMetadataArgsStorage();
    storage.columns.push({
      target: Evidence,
      propertyName: 'zz_guard_probe_related',
      mode: 'regular',
      options: { name: 'zz_guard_probe_related' },
    } as any);

    try {
      const expected = expectedColumns();
      const { columns, selectNames } = insertHalves(
        repo.createQueries(config).insertQuery,
      );

      expect(expected.filter((c) => !columns.includes(c))).toContain(
        'zz_guard_probe_related',
      );
      expect(expected.filter((c) => !selectNames.includes(c))).toContain(
        'zz_guard_probe_related',
      );
      // The precedent's length pin stays GREEN under this very mutation —
      // that is the point: a number cannot see this defect.
      expect(selectNames).toHaveLength(columns.length);
    } finally {
      storage.columns.pop();
    }

    expect(persistedColumnNames()).not.toContain('zz_guard_probe_related');
  });
});
