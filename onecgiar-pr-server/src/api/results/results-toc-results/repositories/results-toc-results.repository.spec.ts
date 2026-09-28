import { Logger } from '@nestjs/common';
import { FindOperator, In } from 'typeorm';
import { ResultsTocResultRepository } from './results-toc-results.repository';

/**
 * P2-3608 - `contributing_indicator` must never be persisted as a negative
 * number. `saveInditicatorsContributing` is the single write bottleneck for the
 * ToC v1/v2, IPSR, share-request and bilateral-center paths, so the guard lives
 * there and is exercised here on both branches (UPDATE and INSERT).
 */
describe('ResultsTocResultRepository - contributing_indicator sign guard (P2-3608)', () => {
  let repository: ResultsTocResultRepository;
  let indicatorRepo: any;
  let targetRepo: any;

  const buildRepository = () => {
    indicatorRepo = {
      update: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue({ result_toc_result_indicator_id: 77 }),
    };
    targetRepo = {
      update: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue(undefined),
    };

    const dataSource: any = {
      createEntityManager: jest.fn().mockReturnValue({}),
    };
    const handlersError: any = { returnErrorRepository: jest.fn((e) => e) };

    const repo = new ResultsTocResultRepository(
      dataSource,
      handlersError,
      indicatorRepo,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      targetRepo,
    );
    // getPhaseYearByResult and getCanonicalIndicatorTarget both go through
    // this.query; an empty result set makes them return null.
    (repo as any).query = jest.fn().mockResolvedValue([]);
    return repo;
  };

  const useInsertBranch = () => {
    indicatorRepo.findOne.mockResolvedValue(null);
  };

  const useUpdateBranch = () => {
    indicatorRepo.findOne.mockResolvedValue({
      result_toc_result_indicator_id: 77,
    });
    targetRepo.findOne.mockResolvedValue({ indicators_targets: 1048 });
  };

  const payloadWith = (target: any) => [
    { toc_results_indicator_id: 'node-1', targets: [target] },
  ];

  const savedTarget = () => targetRepo.save.mock.calls[0][0];

  const updatedTarget = () => {
    const call = targetRepo.update.mock.calls.find((c: any[]) =>
      Object.prototype.hasOwnProperty.call(c[1], 'contributing_indicator'),
    );
    return call[1];
  };

  beforeEach(() => {
    repository = buildRepository();
  });

  it('clamps a negative contribution to 0 on the INSERT branch', async () => {
    useInsertBranch();

    await repository.saveInditicatorsContributing(
      payloadWith({ number_target: 5, contributing_indicator: -1 }),
      500,
      1,
      9,
    );

    expect(savedTarget().contributing_indicator).toBe(0);
  });

  it('clamps a negative contribution sent through the `contributing` alias (P22 paths)', async () => {
    useInsertBranch();

    await repository.saveInditicatorsContributing(
      payloadWith({ number_target: 5, contributing: -7.5 }),
      500,
      1,
      9,
    );

    expect(savedTarget().contributing_indicator).toBe(0);
  });

  it('clamps a negative contribution to 0 on the UPDATE branch', async () => {
    useUpdateBranch();

    await repository.saveInditicatorsContributing(
      payloadWith({
        indicators_targets: 1048,
        number_target: 5,
        contributing_indicator: -1,
      }),
      500,
      1,
      9,
    );

    expect(updatedTarget().contributing_indicator).toBe(0);
  });

  it('keeps 0, which is a real answer for qualitative indicators (P2-3089)', async () => {
    useInsertBranch();

    await repository.saveInditicatorsContributing(
      payloadWith({ number_target: 5, contributing_indicator: 0 }),
      500,
      1,
      9,
    );

    expect(savedTarget().contributing_indicator).toBe(0);
  });

  it('keeps null and undefined as null ("not answered yet")', async () => {
    useInsertBranch();

    await repository.saveInditicatorsContributing(
      payloadWith({ number_target: 5, contributing_indicator: null }),
      500,
      1,
      9,
    );
    expect(savedTarget().contributing_indicator).toBeNull();

    targetRepo.save.mockClear();
    await repository.saveInditicatorsContributing(
      payloadWith({ number_target: 5 }),
      500,
      1,
      9,
    );
    expect(savedTarget().contributing_indicator).toBeNull();
  });

  it('leaves the pre-existing empty-string coercion alone (it already lands as 0)', async () => {
    useInsertBranch();

    await repository.saveInditicatorsContributing(
      payloadWith({ number_target: 5, contributing_indicator: '' }),
      500,
      1,
      9,
    );

    expect(savedTarget().contributing_indicator).toBe(0);
  });

  it('does not touch the sibling fields of the same payload', async () => {
    useInsertBranch();

    await repository.saveInditicatorsContributing(
      payloadWith({
        number_target: 5,
        target_date: 2026,
        indicator_question: true,
        target_progress_narrative: 'hola',
        contributing_indicator: -3,
      }),
      500,
      1,
      9,
    );

    expect(savedTarget()).toEqual(
      expect.objectContaining({
        number_target: 5,
        indicator_question: true,
        target_progress_narrative: 'hola',
        is_active: true,
        contributing_indicator: 0,
      }),
    );
  });
});

/**
 * RTR-T-1 (bugfix/contributor-accept-owner-indicators) — regression coverage
 * written before the fix (RTR-T-2). `saveIndicatorsPrimarySubmitter` resolves
 * the row it attaches a tab's indicators to. Today the `where` filters on
 * `initiative_id` (the `@ManyToOne` relation — a primitive value on it builds
 * no condition in TypeORM 0.3) and a bare `toc_result_id: null` (silently
 * dropped), so the lookup degrades to "the first active row for this result"
 * — the owner's row whenever Planned = No, or whenever a contributor maps the
 * same node the owner uses. See requirements.md RTR-R-1..R-4, RTR-AC-1..AC-3
 * and design.md RTR-DD-2/RTR-DD-3 under
 * docs/specs/bugfix/contributor-accept-owner-indicators/.
 *
 * A minimal builder is duplicated here (rather than reusing the P2-3608
 * `buildRepository()` above) so the existing seven tests in that block stay
 * byte-identical — this block does not touch them.
 */
describe("saveIndicatorsPrimarySubmitter — resolves the tab's own row", () => {
  let repo: ResultsTocResultRepository;
  let warnSpy: jest.SpyInstance;
  let findOneSpy: jest.SpyInstance;
  let updateSpy: jest.SpyInstance;
  let saveImpactSpy: jest.SpyInstance;
  let saveSdgSpy: jest.SpyInstance;
  let saveActionAreaTocSpy: jest.SpyInstance;
  let saveInditicatorsContributingSpy: jest.SpyInstance;

  const buildRepository = () => {
    const dataSource: any = {
      createEntityManager: jest.fn().mockReturnValue({}),
    };
    const handlersError: any = { returnErrorRepository: jest.fn((e) => e) };

    return new ResultsTocResultRepository(
      dataSource,
      handlersError,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  };

  // Mirrors the exact failing-case tab from requirements.md's Scenario
  // (RTR-R-1 / RTR-AC-1): Planned = No, no ToC node.
  const buildTab = (overrides: Record<string, any> = {}) => ({
    initiative_id: 54,
    toc_result_id: null,
    indicators: [
      {
        toc_results_indicator_id: null,
        targets: [{ contributing_indicator: null }],
      },
    ],
    ...overrides,
  });

  const buildDto = (tab: Record<string, any>) => ({
    result_toc_result: {
      planned_result: false,
      result_toc_results: [tab],
    },
  });

  beforeEach(() => {
    repo = buildRepository();
    warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    findOneSpy = jest.spyOn(repo, 'findOne');
    updateSpy = jest.spyOn(repo, 'update').mockResolvedValue(undefined as any);
    saveImpactSpy = jest
      .spyOn(repo, 'saveImpact')
      .mockResolvedValue(undefined as any);
    saveSdgSpy = jest
      .spyOn(repo, 'saveSdg')
      .mockResolvedValue(undefined as any);
    saveActionAreaTocSpy = jest
      .spyOn(repo, 'saveActionAreaToc')
      .mockResolvedValue(undefined as any);
    saveInditicatorsContributingSpy = jest
      .spyOn(repo, 'saveInditicatorsContributing')
      .mockResolvedValue(undefined as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('RTR-TEST-1 — Planned = No: the lookup must filter on the plain initiative column and IS NULL, never the relation and a bare null', async () => {
    // Resolved value is irrelevant to this test — it isolates the `where`
    // shape passed to `findOne`, which is D1's exact mechanism.
    findOneSpy.mockResolvedValue(null);
    const tab = buildTab();

    await repo.saveIndicatorsPrimarySubmitter(buildDto(tab) as any, 32278, 9);

    expect(findOneSpy).toHaveBeenCalledTimes(1);
    const { where } = findOneSpy.mock.calls[0][0];

    expect(where.initiative_ids).toBe(54);
    expect(where).not.toHaveProperty('initiative_id');
    expect(where.toc_result_id).toBeInstanceOf(FindOperator);
    expect((where.toc_result_id as FindOperator<any>).type).toBe('isNull');
    expect(where.is_active).toBe(true);
    expect(where.result_id).toBe(32278);
  });

  it("RTR-TEST-2 — never hands another initiative's row downstream, even when findOne returns one", async () => {
    findOneSpy.mockResolvedValue({
      result_toc_result_id: 42189,
      initiative_ids: 50,
    } as any);
    const tab = buildTab();

    await repo.saveIndicatorsPrimarySubmitter(buildDto(tab) as any, 32278, 9);

    expect(saveInditicatorsContributingSpy).not.toHaveBeenCalled();
    expect(saveImpactSpy).not.toHaveBeenCalled();
    expect(saveSdgSpy).not.toHaveBeenCalled();
    expect(saveActionAreaTocSpy).not.toHaveBeenCalled();
    expect(updateSpy).not.toHaveBeenCalled();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const loggedPayload = JSON.stringify(warnSpy.mock.calls[0]);
    // Numeric ids only — no names, emails or tokens (RTR-R-4, .cursorrules).
    expect(loggedPayload).not.toMatch(/@/);
    expect(loggedPayload).toMatch(/32278/);
    expect(loggedPayload).toMatch(/54/);
  });

  it("RTR-TEST-3 — same node as the owner (RTR-AC-2): picks the tab's own initiative row, not any row sharing the node", async () => {
    const tab = buildTab({
      toc_result_id: 5926,
      indicators: [{ toc_results_indicator_id: 'X' }],
    });
    findOneSpy.mockResolvedValue({
      result_toc_result_id: 42196,
      initiative_ids: 54,
    } as any);

    await repo.saveIndicatorsPrimarySubmitter(buildDto(tab) as any, 32278, 9);

    expect(saveInditicatorsContributingSpy).toHaveBeenCalledTimes(1);
    expect(saveInditicatorsContributingSpy.mock.calls[0][1]).toBe(42196);

    const { where } = findOneSpy.mock.calls[0][0];
    expect(where.toc_result_id).toBe(5926);
    expect(where.toc_result_id).not.toBeInstanceOf(FindOperator);
  });

  it('RTR-TEST-4 — not found (RTR-AC-3): no writes, one warning, the method returns without throwing', async () => {
    findOneSpy.mockResolvedValue(null);
    const tab = buildTab();

    await repo.saveIndicatorsPrimarySubmitter(buildDto(tab) as any, 32278, 9);

    expect(updateSpy).not.toHaveBeenCalled();
    expect(saveImpactSpy).not.toHaveBeenCalled();
    expect(saveSdgSpy).not.toHaveBeenCalled();
    expect(saveActionAreaTocSpy).not.toHaveBeenCalled();
    expect(saveInditicatorsContributingSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});

// BIL-RTE-T-5 / DD-5 — a P25-onward No deactivates the children of the parents the caller
// already deactivated: indicators, indicator targets (grandchildren, scoped by indicator id,
// not by parent id), SDG targets, impact-area targets and action-area links. Logical delete
// only — every assertion below is an `update` call, never `.delete()`/`.remove()`.
describe('ResultsTocResultRepository.deactivateChildrenForParents (BIL-RTE-T-5)', () => {
  let repository: ResultsTocResultRepository;
  let indicatorRepo: any;
  let targetRepo: any;
  let impactAreaRepo: any;
  let sdgTargetRepo: any;
  let actionAreaRepo: any;

  beforeEach(() => {
    indicatorRepo = {
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue(undefined),
    };
    targetRepo = { update: jest.fn().mockResolvedValue(undefined) };
    impactAreaRepo = { update: jest.fn().mockResolvedValue(undefined) };
    sdgTargetRepo = { update: jest.fn().mockResolvedValue(undefined) };
    actionAreaRepo = { update: jest.fn().mockResolvedValue(undefined) };

    const dataSource: any = {
      createEntityManager: jest.fn().mockReturnValue({}),
    };
    const handlersError: any = { returnErrorRepository: jest.fn((e) => e) };

    repository = new ResultsTocResultRepository(
      dataSource,
      handlersError,
      indicatorRepo,
      impactAreaRepo,
      sdgTargetRepo,
      {} as any,
      actionAreaRepo,
      targetRepo,
    );
  });

  it('deactivates indicators, their targets, SDG targets, impact-area targets and action-area links for the given parents', async () => {
    indicatorRepo.find.mockResolvedValueOnce([
      { result_toc_result_indicator_id: 700, is_active: true },
      { result_toc_result_indicator_id: 701, is_active: true },
    ]);

    await repository.deactivateChildrenForParents([10350, 10351], 9);

    expect(indicatorRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ is_active: true }),
      }),
    );
    expect(targetRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_active: true }),
      { is_active: false, last_updated_by: 9 },
    );
    expect(indicatorRepo.update).toHaveBeenCalledWith(
      { result_toc_result_indicator_id: In([700, 701]) },
      { is_active: false, last_updated_by: 9 },
    );
    expect(sdgTargetRepo.update).toHaveBeenCalledWith(
      { result_toc_result_id: In([10350, 10351]), is_active: true },
      { is_active: false, last_updated_by: 9 },
    );
    expect(impactAreaRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_active: true }),
      { is_active: false, last_updated_by: 9 },
    );
    expect(actionAreaRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_active: true }),
      { is_active: false, last_updated_by: 9 },
    );
  });

  it('is a no-op when no parent ids are given (nothing to cascade)', async () => {
    await repository.deactivateChildrenForParents([], 9);

    expect(indicatorRepo.find).not.toHaveBeenCalled();
    expect(sdgTargetRepo.update).not.toHaveBeenCalled();
    expect(impactAreaRepo.update).not.toHaveBeenCalled();
    expect(actionAreaRepo.update).not.toHaveBeenCalled();
  });

  it('skips the target-repository call when the parents have no active indicators', async () => {
    indicatorRepo.find.mockResolvedValueOnce([]);

    await repository.deactivateChildrenForParents([10350], 9);

    expect(targetRepo.update).not.toHaveBeenCalled();
    expect(indicatorRepo.update).not.toHaveBeenCalled();
    // The parent-level link tables are still swept regardless of indicators.
    expect(sdgTargetRepo.update).toHaveBeenCalled();
    expect(impactAreaRepo.update).toHaveBeenCalled();
    expect(actionAreaRepo.update).toHaveBeenCalled();
  });
});

// BIL-RTE-T-5 attempt 2 — Reviewer remediation for R-8.b / design.md §5.2 step 6: "A reactivated
// parent does not reactivate children deactivated by step 4. This must be verified by test, not
// assumed." The risk lives in `saveInditicatorsContributing` (:1790): its FIRST act, whenever
// `id_result_toc_result` is given, is a blanket sweep that deactivates every indicator row of that
// parent — old and new alike — before the per-item loop runs. A later Yes that reactivates an old
// parent and names a DIFFERENT indicator must never let that old indicator (or its targets) come
// back active: the per-item loop only ever reactivates the ONE indicator named in the payload, via
// an explicit `{ is_active: true }` update scoped to that indicator's own id — never the old one.
describe('ResultsTocResultRepository.saveInditicatorsContributing — R-8.b: a reactivated parent does not revive a different old indicator', () => {
  let repository: ResultsTocResultRepository;
  let indicatorRepo: any;
  let targetRepo: any;

  const PARENT_ID = 10350; // the reactivated OLD parent (result_toc_result_id)
  const NEW_INDICATOR_ROW_ID = 900;

  beforeEach(() => {
    indicatorRepo = {
      // No active row for the NEW indicator under this parent yet -> the
      // per-item loop takes the INSERT branch (`.save`), never `.update`
      // with `is_active: true`.
      findOne: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue(undefined),
      save: jest.fn().mockResolvedValue({
        result_toc_result_indicator_id: NEW_INDICATOR_ROW_ID,
      }),
    };
    targetRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue(undefined),
      save: jest.fn().mockResolvedValue(undefined),
    };

    const dataSource: any = {
      createEntityManager: jest.fn().mockReturnValue({}),
    };
    const handlersError: any = { returnErrorRepository: jest.fn((e) => e) };

    repository = new ResultsTocResultRepository(
      dataSource,
      handlersError,
      indicatorRepo,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      targetRepo,
    );
    // getPhaseYearByResult goes through this.query; an empty result set
    // makes it return null, same as the P2-3608 fixture above.
    (repository as any).query = jest.fn().mockResolvedValue([]);
  });

  it('runs the first sweep, never reactivates the old indicator, and never revives its targets', async () => {
    await repository.saveInditicatorsContributing(
      [{ toc_results_indicator_id: 'indicator-NEW', targets: [] }],
      PARENT_ID,
      500,
      9,
    );

    // 1) The first sweep runs, deactivating every indicator of this parent
    //    (old and new alike) before anything else happens.
    expect(indicatorRepo.update).toHaveBeenCalledWith(
      { results_toc_results_id: PARENT_ID },
      { is_active: false, last_updated_by: 9 },
    );

    // 2) The indicator repository never receives `is_active: true` for the
    //    OLD indicator (or for anything) — the new indicator is a fresh
    //    INSERT (`.save`), never an `.update` reactivation. The sweep above
    //    is the only `update` call this run makes.
    expect(indicatorRepo.update).toHaveBeenCalledTimes(1);
    expect(
      indicatorRepo.update.mock.calls.some(
        ([, changes]: any[]) => changes?.is_active === true,
      ),
    ).toBe(false);

    // 3) The target repository never reactivates the old indicator's
    //    targets: no `update` call touches `result_indicators_targets` at
    //    all in this run (there is no existing indicator row to update the
    //    targets of).
    expect(targetRepo.update).not.toHaveBeenCalled();

    // The new indicator was inserted fresh, scoped to its own new row id —
    // structurally incapable of touching the old indicator's targets.
    expect(indicatorRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        results_toc_results_id: PARENT_ID,
        toc_results_indicator_id: 'indicator-NEW',
        is_active: true,
      }),
    );
  });
});

// -----------------------------------------------------------------------------
// TTD-T-1 (bugfix/toc-target-row-duplication) — regression coverage, red on
// ca99689b4. `saveInditicatorsContributing` cannot recognise the row a ToC
// meta already owns: the GET writes a ToC-catalog id into the payload field
// `indicators_targets` for a meta with no stored row yet
// (results-toc-results.service.ts:3329), the write reads that field back as a
// `result_indicators_targets` primary key (:1883-1892), and the fallback
// lookup then compares the meta's raw `number_target` against a row whose
// stored value this same method already overwrote to the canonical value
// (:1870-1874 vs :1899). See requirements.md TTD-R-1, TTD-R-2, TTD-R-5,
// TTD-AC-1, TTD-AC-2, TTD-AC-4 and the *duplication* / *lost contribution*
// scenarios; design.md §3.2, §7, TTD-DD-3; tasks.md TTD-T-1 — all under
// docs/specs/bugfix/toc-target-row-duplication/.
//
// Unlike the P2-3608 `buildRepository()` above, `indicatorRepo`/`targetRepo`
// here are STATEFUL fakes backed by real in-memory arrays: proving row
// IDENTITY across two saves requires the second save's lookups to actually
// see what the first save persisted, which a one-shot jest mock cannot
// express. `(repo as any).query` is stubbed to return REAL rows for both
// `getPhaseYearByResult` and `getCanonicalIndicatorTarget` — the existing
// blocks' `[]` stub makes the canonical resolution return `null` in every
// case, which would make these three tests assert nothing about identity.
// The two helpers below are shared by the three `describe` blocks that
// follow; nothing here touches the existing harness above.
// -----------------------------------------------------------------------------

const TTD_PARENT_ID = 5001; // results_toc_results_id
const TTD_RESULT_ID = 12099; // result.id — feeds getPhaseYearByResult
const TTD_USER_ID = 9;
const TTD_PHASE_YEAR = 2026;
const TTD_CANONICAL_NUMBER_TARGET = 6; // one canonical value per indicator (resolvedNumberTarget, :1870-1874)

// TTD-T-3 (bugfix/toc-target-row-duplication) — the RESILIENCE forward
// pointer from TTD-T-1's Reviewer: `ttdMatches` used to compare every
// criterion with `===`, so a real TypeORM operator object (this task's
// retire pass uses `Not(In([...]))`) would never equal a plain row value and
// would silently match ZERO rows — the retire pass would look green while
// actually being inert. Evaluated through the operator's OWN `type`/`child`/
// `value` getters (never hand-rolled SQL semantics), so the fake stays
// faithful to what TypeORM itself would do: `In([]).type === 'in'` with an
// empty array is the same "matches nothing" case the real query builder
// renders as `0=1` (node_modules/typeorm/query-builder/QueryBuilder.js), so
// `Not(In([]))` here evaluates to true for every row, exactly like the real
// `NOT(0=1)`.
const isTtdFindOperator = (value: unknown): value is FindOperator<any> =>
  !!value &&
  typeof value === 'object' &&
  (value as any)['@instanceof'] === Symbol.for('FindOperator');

const evaluateTtdOperator = (
  operator: FindOperator<any>,
  actual: any,
): boolean => {
  if (operator.type === 'not') {
    const child = operator.child;
    if (child) return !evaluateTtdOperator(child, actual);
    return actual !== operator.value;
  }
  if (operator.type === 'in') {
    return (operator.value as any[]).includes(actual);
  }
  throw new Error(
    `ttdMatches: unsupported FindOperator type "${operator.type}" — teach the fake before trusting a green from it.`,
  );
};

const ttdMatches = (row: Record<string, any>, where: Record<string, any>) =>
  Object.entries(where).every(([key, value]) =>
    isTtdFindOperator(value)
      ? evaluateTtdOperator(value, row[key])
      : row[key] === value,
  );

/**
 * One catalog meta the design's future per-meta identity read will need: its
 * own ToC-namespace id plus its own raw `number_target`/`target_date` — the
 * shape `getCanonicalIndicatorTarget`'s real SQL selects
 * (`trit.number_target`, `trit.target_date`) plus the identity column real
 * catalog rows carry (`toc_indicator_target_id`; verified at source, prtest
 * row 2235 carries 624180).
 */
type TtdCatalogMeta = {
  toc_indicator_target_id: number;
  number_target: number;
  target_date?: string;
};

const buildTtdStatefulRepository = (catalogMetas: TtdCatalogMeta[] = []) => {
  const indicatorRows: any[] = [];
  const targetRows: any[] = [];
  let nextIndicatorId = 900;
  let nextTargetId = 9000;

  const indicatorRepo: any = {
    findOne: jest.fn(async ({ where }: any) => {
      const found = indicatorRows.find((row) => ttdMatches(row, where));
      return found ? { ...found } : null;
    }),
    update: jest.fn(async (where: any, changes: any) => {
      indicatorRows
        .filter((row) => ttdMatches(row, where))
        .forEach((row) => Object.assign(row, changes));
    }),
    save: jest.fn(async (row: any) => {
      const saved = {
        result_toc_result_indicator_id: nextIndicatorId++,
        ...row,
      };
      indicatorRows.push(saved);
      return { ...saved };
    }),
  };

  const targetRepo: any = {
    findOne: jest.fn(async ({ where }: any) => {
      const found = targetRows.find((row) => ttdMatches(row, where));
      return found ? { ...found } : null;
    }),
    update: jest.fn(async (where: any, changes: any) => {
      targetRows
        .filter((row) => ttdMatches(row, where))
        .forEach((row) => Object.assign(row, changes));
    }),
    save: jest.fn(async (row: any) => {
      const saved = { indicators_targets: nextTargetId++, ...row };
      targetRows.push(saved);
      return { ...saved };
    }),
  };

  const dataSource: any = {
    createEntityManager: jest.fn().mockReturnValue({}),
  };
  const handlersError: any = { returnErrorRepository: jest.fn((e) => e) };

  const repo = new ResultsTocResultRepository(
    dataSource,
    handlersError,
    indicatorRepo,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    targetRepo,
  );

  // getPhaseYearByResult and getCanonicalIndicatorTarget both go through
  // this.query. Both are stubbed with REAL rows (never `[]`) so canonical
  // resolution is actually exercised — an empty catalog would make
  // getCanonicalIndicatorTarget return null and neuter these tests.
  (repo as any).query = jest.fn(async (sql: string) => {
    if (typeof sql === 'string' && sql.includes('phase_year')) {
      return [{ phase_year: TTD_PHASE_YEAR }];
    }
    if (
      typeof sql === 'string' &&
      sql.includes('toc_result_indicator_target')
    ) {
      // getCanonicalIndicatorTarget's real SQL is `ORDER BY target_date DESC
      // LIMIT 1` and the method only ever reads `rows[0]` — so the canonical
      // row goes FIRST, keeping today's resolution untouched (still
      // TTD_CANONICAL_NUMBER_TARGET, which TTD-TEST-3 depends on staying
      // shared across metas of one indicator). The per-meta rows that follow
      // are real catalog shapes (their own `toc_indicator_target_id`,
      // `number_target`, `target_date`) that today's method never reads past
      // index 0 — they exist so a real catalog row set is available, per the
      // task's own Red run clause ("stub the catalog read with real rows
      // instead, or they assert nothing about identity"), and so a future
      // per-meta catalog read (TTD-T-2) has rows to resolve identity
      // against.
      return [
        {
          number_target: TTD_CANONICAL_NUMBER_TARGET,
          target_date: '2026-01-01',
        },
        ...catalogMetas.map((meta) => ({
          number_target: meta.number_target,
          target_date: meta.target_date ?? '2026-01-01',
          toc_indicator_target_id: meta.toc_indicator_target_id,
        })),
      ];
    }
    return [];
  });

  return { repo, indicatorRepo, targetRepo, indicatorRows, targetRows };
};

describe('ResultsTocResultRepository.saveInditicatorsContributing — TTD-TEST-1: the duplication (red on ca99689b4)', () => {
  it('a second save of an unchanged multi-meta payload must not insert new rows (TTD-R-1, TTD-AC-1)', async () => {
    const { repo, targetRepo, targetRows } = buildTtdStatefulRepository([
      { toc_indicator_target_id: 700001, number_target: 17 },
      { toc_indicator_target_id: 700002, number_target: 28 },
    ]);

    // Both metas carry a ToC-catalog id in `indicators_targets` — exactly
    // what the GET writes for a meta with no stored row yet
    // (results-toc-results.service.ts:3329) — never a
    // result_indicators_targets primary key.
    const payload = [
      {
        toc_results_indicator_id: 'toc-node-1',
        targets: [
          {
            indicators_targets: 700001,
            number_target: 17,
            contributing_indicator: null,
          },
          {
            indicators_targets: 700002,
            number_target: 28,
            contributing_indicator: null,
          },
        ],
      },
    ];

    await repo.saveInditicatorsContributing(
      payload,
      TTD_PARENT_ID,
      TTD_RESULT_ID,
      TTD_USER_ID,
    );

    expect(targetRepo.save).toHaveBeenCalledTimes(2);
    const rowIdsAfterFirstSave = targetRows
      .map((row) => row.indicators_targets)
      .sort();
    expect(rowIdsAfterFirstSave).toHaveLength(2);

    targetRepo.save.mockClear();
    targetRepo.update.mockClear();

    await repo.saveInditicatorsContributing(
      payload,
      TTD_PARENT_ID,
      TTD_RESULT_ID,
      TTD_USER_ID,
    );

    // TTD-R-1 / TTD-AC-1 / the *duplication* scenario's `BUT` clause: the
    // second save of an unchanged payload must not INSERT — it must resolve
    // every meta to the row the first save created and UPDATE it.
    expect(targetRepo.save).not.toHaveBeenCalled();
    const updatedRowIds = targetRepo.update.mock.calls
      .map(([where]: any) => where?.indicators_targets)
      .filter((id: any) => rowIdsAfterFirstSave.includes(id));
    expect(updatedRowIds.sort()).toEqual(rowIdsAfterFirstSave);
  });
});

describe('ResultsTocResultRepository.saveInditicatorsContributing — TTD-TEST-2: the lost contribution (red on ca99689b4)', () => {
  const INDICATOR_ROW_ID = 501;
  const STORED_TARGET_PK = 2235; // mirrors the real row the creation flow writes

  it('a stored contribution re-affirmed by the payload must not gain a null-carrying successor row (TTD-R-2, TTD-AC-2)', async () => {
    const { repo, indicatorRows, targetRows } = buildTtdStatefulRepository();

    // Seed: the indicator and the target row the creation flow already wrote
    // — active, carrying the contribution (6) the reporter typed
    // (framework-result-toc-indicators.service.ts:215-247).
    indicatorRows.push({
      result_toc_result_indicator_id: INDICATOR_ROW_ID,
      results_toc_results_id: TTD_PARENT_ID,
      toc_results_indicator_id: 'toc-node-M',
      is_active: true,
    });
    targetRows.push({
      indicators_targets: STORED_TARGET_PK,
      result_toc_result_indicator_id: INDICATOR_ROW_ID,
      number_target: TTD_CANONICAL_NUMBER_TARGET,
      contributing_indicator: 6,
      is_active: true,
      target_date: TTD_PHASE_YEAR,
    });

    // The payload the (buggy) GET returns for this indicator: one entry that
    // correctly echoes the stored row's own primary key (the one case the
    // GET gets right — results-toc-results.service.ts:647-656), PLUS the
    // phantom catalog duplicate for the SAME meta M — appended because the
    // merge at results-toc-results.service.ts:3300-3320 compares the row's
    // now-canonical `number_target` (6) against the catalog's own raw number
    // (42) and finds no match.
    const payload = [
      {
        toc_results_indicator_id: 'toc-node-M',
        targets: [
          {
            indicators_targets: STORED_TARGET_PK,
            number_target: TTD_CANONICAL_NUMBER_TARGET,
            contributing_indicator: 6,
          },
          {
            indicators_targets: 700003, // ToC id, not a result_indicators_targets PK
            number_target: 42, // M's own raw catalog number
            contributing_indicator: null,
          },
        ],
      },
    ];

    await repo.saveInditicatorsContributing(
      payload,
      TTD_PARENT_ID,
      TTD_RESULT_ID,
      TTD_USER_ID,
    );

    const storedRow = targetRows.find(
      (row) => row.indicators_targets === STORED_TARGET_PK,
    );
    expect(storedRow.is_active).toBe(true);
    expect(storedRow.contributing_indicator).toBe(6);

    // TTD-R-2 / the *lost contribution* scenario's `AND IT MUST NOT` clause:
    // no second row for meta M may exist carrying a null contribution.
    const rowsForIndicator = targetRows.filter(
      (row) => row.result_toc_result_indicator_id === INDICATOR_ROW_ID,
    );
    expect(rowsForIndicator).toHaveLength(1);
  });

  it("must never deactivate the stored row without an active successor already carrying its value (TTD-R-6, the *lost contribution* scenario's `BUT` clause)", async () => {
    const { repo, indicatorRows, targetRepo, targetRows } =
      buildTtdStatefulRepository();

    // Same seed as the sibling test above — duplicated rather than shared so
    // each test stays independently readable (matches this file's own R-8.b
    // precedent of duplicating fixtures for isolation).
    indicatorRows.push({
      result_toc_result_indicator_id: INDICATOR_ROW_ID,
      results_toc_results_id: TTD_PARENT_ID,
      toc_results_indicator_id: 'toc-node-M',
      is_active: true,
    });
    targetRows.push({
      indicators_targets: STORED_TARGET_PK,
      result_toc_result_indicator_id: INDICATOR_ROW_ID,
      number_target: TTD_CANONICAL_NUMBER_TARGET,
      contributing_indicator: 6,
      is_active: true,
      target_date: TTD_PHASE_YEAR,
    });

    const payload = [
      {
        toc_results_indicator_id: 'toc-node-M',
        targets: [
          {
            indicators_targets: STORED_TARGET_PK,
            number_target: TTD_CANONICAL_NUMBER_TARGET,
            contributing_indicator: 6,
          },
          {
            indicators_targets: 700003,
            number_target: 42,
            contributing_indicator: null,
          },
        ],
      },
    ];

    // Wrap the fake's `update` so a deactivating call is checked against the
    // LIVE state at the instant it fires — the blanket sweep
    // (repository.ts:1857-1866) deactivates every target of the indicator
    // BEFORE the per-meta loop runs any lookup, so this must be red today
    // even though the row is correctly restored later in the SAME call. A
    // snapshot taken only at the end (after the restore) could never observe
    // that intermediate, unreachable state.
    const deactivationChecks: boolean[] = [];
    const baseTargetUpdate = targetRepo.update.getMockImplementation();
    targetRepo.update.mockImplementation(async (where: any, changes: any) => {
      await baseTargetUpdate(where, changes);
      const isDeactivatingRow2235 =
        changes?.is_active === false &&
        (where?.result_toc_result_indicator_id === INDICATOR_ROW_ID ||
          where?.indicators_targets === STORED_TARGET_PK);
      if (isDeactivatingRow2235) {
        const hasActiveSuccessor = targetRows.some(
          (row) =>
            row.result_toc_result_indicator_id === INDICATOR_ROW_ID &&
            row.is_active &&
            row.contributing_indicator === 6,
        );
        deactivationChecks.push(hasActiveSuccessor);
      }
    });

    await repo.saveInditicatorsContributing(
      payload,
      TTD_PARENT_ID,
      TTD_RESULT_ID,
      TTD_USER_ID,
    );

    // Sanity: the check above must actually have fired at least once, or
    // this assertion would pass vacuously.
    expect(deactivationChecks.length).toBeGreaterThan(0);
    // TTD-R-6 / the *lost contribution* scenario's `BUT` clause: no `update`
    // may deactivate the row without an active successor already carrying
    // its value AT THAT MOMENT — today's blanket-sweep-then-restore pattern
    // violates this even though the row ends the call correctly restored.
    expect(deactivationChecks.every(Boolean)).toBe(true);
  });
});

describe('ResultsTocResultRepository.saveInditicatorsContributing — TTD-TEST-3: no collapse (red on ca99689b4)', () => {
  it('two metas sharing one canonical number_target must stay two distinct rows across saves (TTD-R-5, TTD-AC-4)', async () => {
    const { repo, targetRepo, targetRows } = buildTtdStatefulRepository([
      { toc_indicator_target_id: 700004, number_target: 17 },
      { toc_indicator_target_id: 700005, number_target: 28 },
    ]);

    // Two metas of ONE indicator: getCanonicalTarget is resolved once per
    // indicator and stamped on every one of its metas (:1819-1824,
    // :1870-1874), so both resolve to the SAME canonical number_target (6)
    // once written — while their own raw catalog numbers (17, 28) and ToC
    // ids (700004, 700005) stay distinct. Mirrors the 11-metas-one-canonical
    // shape confirmed at source on prtest (tasks.md TTD-T-1: distinct_numbers
    // = 1 across 11 distinct catalog metas).
    const payload = [
      {
        toc_results_indicator_id: 'toc-node-shared',
        targets: [
          {
            indicators_targets: 700004,
            number_target: 17,
            contributing_indicator: null,
          },
          {
            indicators_targets: 700005,
            number_target: 28,
            contributing_indicator: null,
          },
        ],
      },
    ];

    await repo.saveInditicatorsContributing(
      payload,
      TTD_PARENT_ID,
      TTD_RESULT_ID,
      TTD_USER_ID,
    );

    const activeIdsAfterFirstSave = targetRows
      .filter((row) => row.is_active)
      .map((row) => row.indicators_targets)
      .sort();
    expect(activeIdsAfterFirstSave).toHaveLength(2);
    // Both share the canonical value — the exact condition a "key the lookup
    // on resolvedNumberTarget" fix would exploit to collapse them (TTD-DD-3).
    expect(
      targetRows.every(
        (row) => row.number_target === TTD_CANONICAL_NUMBER_TARGET,
      ),
    ).toBe(true);

    targetRepo.save.mockClear();

    await repo.saveInditicatorsContributing(
      payload,
      TTD_PARENT_ID,
      TTD_RESULT_ID,
      TTD_USER_ID,
    );

    // Named mutation (design.md TTD-DD-3, tasks.md TTD-T-1 falsifier): keying
    // the fallback lookup on the canonical `resolvedNumberTarget` instead of
    // the payload's raw number would make the second meta match the first
    // meta's row and collapse onto it. This assertion must catch that as
    // surely as it catches today's duplication.
    expect(targetRepo.save).not.toHaveBeenCalled();
    const activeIdsAfterSecondSave = targetRows
      .filter((row) => row.is_active)
      .map((row) => row.indicators_targets)
      .sort();
    expect(activeIdsAfterSecondSave).toEqual(activeIdsAfterFirstSave);
  });
});

describe('ResultsTocResultRepository.saveInditicatorsContributing — TTD-TEST-4: retire only the untouched rows (TTD-T-3)', () => {
  // Both cases below are deliberately NOT end-state-only. On `ca99689b4`
  // (the still-unmoved, still-blanket sweep at the top of the `if
  // (targetIndicators)` branch) the FINAL row state looks identical whether
  // the sweep runs before or after the per-meta loop — sweep-then-restore
  // produces the same end state as retire-after-loop. tasks.md's Red run
  // clause names this by hand: "today they pass by accident through the
  // blanket sweep". What the OLD code can never produce is a deactivating
  // `update` call whose `where` narrows `indicators_targets` at all — its
  // blanket sweep's `where` is `{ result_toc_result_indicator_id }` alone,
  // with no such key. That shape (`Not(In(touched))`) is the assertion that
  // actually distinguishes the moved-and-narrowed retire pass from the
  // accident, so each test below checks it in addition to the end state.
  const findDeactivatingCall = (
    targetRepo: any,
    resultTocResultIndicatorId: number,
  ) =>
    targetRepo.update.mock.calls.find(
      ([where, changes]: any) =>
        changes?.is_active === false &&
        where?.result_toc_result_indicator_id === resultTocResultIndicatorId,
    );

  // Reads the `Not(In([...]))` shape through the FindOperator's OWN
  // `type`/`child`/`value` getters (never hand-rolled SQL semantics) — the
  // same discipline `ttdMatches` above uses, per the RESILIENCE forward
  // pointer from TTD-T-1's Reviewer.
  const asNotInOperator = (value: unknown): FindOperator<any> | null => {
    if (!isTtdFindOperator(value)) return null;
    if (value.type !== 'not') return null;
    const child = value.child;
    if (!child || child.type !== 'in') return null;
    return value;
  };

  it('an indicator whose targets is absent must still retire every stored row for it (Step 2.3 condition (a), TTD-R-6, TTD-AC-6)', async () => {
    const INDICATOR_ROW_ID = 9101;
    const { indicatorRows, repo, targetRepo, targetRows } =
      buildTtdStatefulRepository();

    indicatorRows.push({
      result_toc_result_indicator_id: INDICATOR_ROW_ID,
      results_toc_results_id: TTD_PARENT_ID,
      toc_results_indicator_id: 'toc-node-no-targets',
      is_active: true,
    });
    targetRows.push(
      {
        indicators_targets: 9001,
        result_toc_result_indicator_id: INDICATOR_ROW_ID,
        number_target: TTD_CANONICAL_NUMBER_TARGET,
        contributing_indicator: null,
        is_active: true,
        target_date: TTD_PHASE_YEAR,
      },
      {
        indicators_targets: 9002,
        result_toc_result_indicator_id: INDICATOR_ROW_ID,
        number_target: TTD_CANONICAL_NUMBER_TARGET,
        contributing_indicator: null,
        is_active: true,
        target_date: TTD_PHASE_YEAR,
      },
    );

    // DTO-legal shape (create-results-toc-result-v2.dto.ts: `targets` is
    // `@ApiPropertyOptional`): this indicator's payload entry omits it
    // entirely, exactly the shape condition (a) exists to guard.
    const payload = [{ toc_results_indicator_id: 'toc-node-no-targets' }];

    await repo.saveInditicatorsContributing(
      payload,
      TTD_PARENT_ID,
      TTD_RESULT_ID,
      TTD_USER_ID,
    );

    // Fake-inertness / Disqualifier proof together: if the retire pass were
    // skipped outright (the named mutation — "skip the retire pass when no
    // ids were collected") OR the fake silently matched zero rows for a
    // `Not(In([]))` criterion, these rows would still read `is_active: true`
    // here.
    const rowsForIndicator = targetRows.filter(
      (row) => row.result_toc_result_indicator_id === INDICATOR_ROW_ID,
    );
    expect(rowsForIndicator).toHaveLength(2);
    expect(rowsForIndicator.every((row) => row.is_active === false)).toBe(true);

    // Post-change-ordering proof (Red run clause) — see the describe-level
    // comment: this is what stays red on `ca99689b4` while the end-state
    // assertion above passes there by accident.
    const deactivatingCall = findDeactivatingCall(targetRepo, INDICATOR_ROW_ID);
    expect(deactivatingCall).toBeDefined();
    const [where] = deactivatingCall;
    const operator = asNotInOperator(where.indicators_targets);
    expect(operator).not.toBeNull();
    expect(operator!.value).toEqual([]);
  });

  it('a payload carrying one of two stored metas retires only the other, keeping the carried one active (TTD-R-6, TTD-AC-6)', async () => {
    const INDICATOR_ROW_ID = 9102;
    const KEPT_PK = 9201;
    const DROPPED_PK = 9202;
    const { indicatorRows, repo, targetRepo, targetRows } =
      buildTtdStatefulRepository();

    indicatorRows.push({
      result_toc_result_indicator_id: INDICATOR_ROW_ID,
      results_toc_results_id: TTD_PARENT_ID,
      toc_results_indicator_id: 'toc-node-partial',
      is_active: true,
    });
    targetRows.push(
      {
        indicators_targets: KEPT_PK,
        result_toc_result_indicator_id: INDICATOR_ROW_ID,
        number_target: TTD_CANONICAL_NUMBER_TARGET,
        contributing_indicator: 6,
        is_active: true,
        target_date: TTD_PHASE_YEAR,
      },
      {
        indicators_targets: DROPPED_PK,
        result_toc_result_indicator_id: INDICATOR_ROW_ID,
        number_target: TTD_CANONICAL_NUMBER_TARGET,
        contributing_indicator: null,
        is_active: true,
        target_date: TTD_PHASE_YEAR,
      },
    );

    // Only the kept meta is re-affirmed by this save; the dropped meta is
    // simply not in the payload any more (the ordinary "no longer contains
    // it" shape of TTD-AC-6).
    const payload = [
      {
        toc_results_indicator_id: 'toc-node-partial',
        targets: [
          {
            indicators_targets: KEPT_PK,
            number_target: TTD_CANONICAL_NUMBER_TARGET,
            contributing_indicator: 6,
          },
        ],
      },
    ];

    await repo.saveInditicatorsContributing(
      payload,
      TTD_PARENT_ID,
      TTD_RESULT_ID,
      TTD_USER_ID,
    );

    const keptRow = targetRows.find(
      (row) => row.indicators_targets === KEPT_PK,
    );
    const droppedRow = targetRows.find(
      (row) => row.indicators_targets === DROPPED_PK,
    );
    // Fake-inertness proof, the non-empty-touched-set case the Reviewer's
    // forward pointer named directly: a `Not(In([KEPT_PK]))` criterion the
    // fake silently matched zero rows against would leave `droppedRow`
    // active.
    expect(keptRow.is_active).toBe(true);
    expect(droppedRow.is_active).toBe(false);

    // Post-change-ordering proof (Red run clause) — see the describe-level
    // comment.
    const deactivatingCall = findDeactivatingCall(targetRepo, INDICATOR_ROW_ID);
    expect(deactivatingCall).toBeDefined();
    const [where] = deactivatingCall;
    const operator = asNotInOperator(where.indicators_targets);
    expect(operator).not.toBeNull();
    expect(operator!.value).toEqual([KEPT_PK]);
  });
});
