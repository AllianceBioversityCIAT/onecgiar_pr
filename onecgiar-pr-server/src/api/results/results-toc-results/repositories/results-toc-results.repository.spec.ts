import { Logger } from '@nestjs/common';
import { FindOperator } from 'typeorm';
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
