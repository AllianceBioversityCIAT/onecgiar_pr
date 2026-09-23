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
