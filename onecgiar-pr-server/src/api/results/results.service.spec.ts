import { ResultsService } from './results.service';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { ResultTypeEnum } from '../../shared/constants/result-type.enum';
import { MWB_COMPLETENESS_CAP } from './results-validation-module/completeness';
import { ReviewDecisionEnum } from './dto/review-decision.dto';
import { ResultStatusData } from '../../shared/constants/result-status.enum';
import { SourceEnum } from './entities/result.entity';

/**
 * `changes/my-work-board` MWB-T-1 — `findAllByRoleFiltered` (the `roles/filter` list) gains an
 * opt-in `include_completeness` flag (MWB-R-8). `ResultsService` has a very large constructor, so
 * the unit under test is built off the prototype with just the collaborators this method touches
 * (mirrors `results.service.innovation-link.spec.ts`).
 *
 * The "no flag" test below is written against the CURRENT mapping (no `completeness` key, no
 * validation call) — it must already be green before the fold is added, per the task's
 * disqualifier: a default-path expectation written by snapshotting the new code is not evidence.
 */
describe('ResultsService — findAllByRoleFiltered include_completeness (MWB-T-1)', () => {
  const user = { id: 1 } as TokenDto;

  function baseItem(overrides: Record<string, any>) {
    return {
      id: 1,
      submitter_id: 10,
      status_id: 1,
      result_type_id: ResultTypeEnum.KNOWLEDGE_PRODUCT,
      created_date: '2026-01-01T00:00:00.000Z',
      acronym: 'SP01',
      submitter_name: 'Science Program 01',
      ...overrides,
    };
  }

  function makeService(config: {
    items: any[];
    validateResultById?: jest.Mock;
  }) {
    const service: any = Object.create(ResultsService.prototype);
    service._logger = { warn: jest.fn(), error: jest.fn(), log: jest.fn() };
    service._handlersError = { returnErrorRes: jest.fn((c: any) => c.error) };
    service._customResultRepository = {
      AllResultsByRoleUserAndInitiativeFiltered: jest.fn().mockResolvedValue({
        results: config.items,
        total: config.items.length,
      }),
    };
    service._initiativeEntityMapRepository = {
      find: jest.fn().mockResolvedValue([]),
    };
    service._roleByUserRepository = {
      find: jest.fn().mockResolvedValue([]),
    };
    service._resultValidationRepository = {
      validateResultById:
        config.validateResultById ?? jest.fn().mockResolvedValue([]),
    };
    return service;
  }

  it('flag absent: no `completeness` key on any item, and the validation repository is never called (MWB-R-8 "Flag absent keeps the contract")', async () => {
    const items = [baseItem({ id: 1 }), baseItem({ id: 2, status_id: 3 })];
    const service = makeService({ items });

    const res: any = await service.findAllByRoleFiltered(1, {}, user);

    expect(res.status).toBe(200);
    for (const item of res.response.items) {
      expect(item).not.toHaveProperty('completeness');
    }
    expect(
      service._resultValidationRepository.validateResultById,
    ).not.toHaveBeenCalled();
  });

  it('flag false: same as absent — no key, no call', async () => {
    const items = [baseItem({ id: 1 })];
    const service = makeService({ items });

    const res: any = await service.findAllByRoleFiltered(
      1,
      { include_completeness: 'false' },
      user,
    );

    for (const item of res.response.items) {
      expect(item).not.toHaveProperty('completeness');
    }
    expect(
      service._resultValidationRepository.validateResultById,
    ).not.toHaveBeenCalled();
  });

  it('flag true: calls the validation repository only for eligible (status 1/8, non-IPSR) items, newest created first, capped at 60 out of 65 eligible', async () => {
    const eligible = Array.from({ length: 65 }, (_, i) =>
      baseItem({
        id: 100 + i,
        status_id: i % 2 === 0 ? 1 : 8,
        // newest (highest i) has the latest created_date
        created_date: new Date(2026, 0, 1 + i).toISOString(),
      }),
    );
    const submitted = baseItem({
      id: 999,
      status_id: 3,
      created_date: new Date(2026, 5, 1).toISOString(),
    });
    const ipsr = baseItem({
      id: 998,
      status_id: 1,
      result_type_id: ResultTypeEnum.INNOVATION_USE_IPSR,
      created_date: new Date(2026, 5, 2).toISOString(),
    });
    const items = [...eligible, submitted, ipsr];

    const validateResultById = jest
      .fn()
      .mockResolvedValue([
        { section_name: 'general-information', validation: 1 },
      ]);
    const service = makeService({ items, validateResultById });

    const res: any = await service.findAllByRoleFiltered(
      1,
      { include_completeness: 'true' },
      user,
    );

    expect(res.status).toBe(200);
    expect(validateResultById).toHaveBeenCalledTimes(MWB_COMPLETENESS_CAP);

    // newest-first: the eligible fixture's newest is index 64 (id 164) down to index 5 (id 105)
    // — the first 60 of the 65 eligible items sorted by created_date descending.
    const calledIds = validateResultById.mock.calls.map((call) => call[0]);
    const expectedIds = eligible
      .slice()
      .sort(
        (a, b) =>
          new Date(b.created_date).getTime() -
          new Date(a.created_date).getTime(),
      )
      .slice(0, MWB_COMPLETENESS_CAP)
      .map((item) => item.id);
    expect(calledIds).toEqual(expectedIds);

    const byId = new Map(
      res.response.items.map((item: any) => [item.id, item]),
    );
    // Submitted item: ineligible status -> null, no call for it.
    expect((byId.get(999) as any).completeness).toBeNull();
    // IPSR package: excluded even though status is eligible -> null, no call for it.
    expect((byId.get(998) as any).completeness).toBeNull();
    expect(calledIds).not.toContain(999);
    expect(calledIds).not.toContain(998);
    // The oldest eligible item (id 100) is the 61st eligible item -> past the cap -> null.
    expect((byId.get(100) as any).completeness).toBeNull();
    // A called (top-60) eligible item gets the real fold.
    const newestId = expectedIds[0];
    expect((byId.get(newestId) as any).completeness).toEqual({
      complete: 1,
      total: 1,
      missing: [],
    });
  });

  it('one rejected validation call isolates to that item as null; other items still populated; the request still resolves 200', async () => {
    const items = [
      baseItem({ id: 1, created_date: '2026-01-03T00:00:00.000Z' }),
      baseItem({ id: 2, created_date: '2026-01-02T00:00:00.000Z' }),
      baseItem({ id: 3, created_date: '2026-01-01T00:00:00.000Z' }),
    ];
    const validateResultById = jest.fn().mockImplementation((id: number) => {
      if (id === 2) return Promise.reject(new Error('ER_SP_DOES_NOT_EXIST'));
      return Promise.resolve([
        { section_name: 'general-information', validation: 1 },
        { section_name: 'geographic-location', validation: 0 },
      ]);
    });
    const service = makeService({ items, validateResultById });

    const res: any = await service.findAllByRoleFiltered(
      1,
      { include_completeness: 'true' },
      user,
    );

    expect(res.status).toBe(200);
    const byId = new Map(
      res.response.items.map((item: any) => [item.id, item]),
    );
    expect((byId.get(2) as any).completeness).toBeNull();
    expect((byId.get(1) as any).completeness).toEqual({
      complete: 1,
      total: 2,
      missing: ['geographic-location'],
    });
    expect((byId.get(3) as any).completeness).toEqual({
      complete: 1,
      total: 2,
      missing: ['geographic-location'],
    });
    expect(service._logger.warn).toHaveBeenCalledTimes(1);
    expect(service._logger.warn).toHaveBeenCalledWith(
      'my-work completeness failed',
      { resultId: 2 },
    );
  });
});

describe('ResultsService — getScienceProgramProgress plannedKpis & results breakdown (RFR-T-1)', () => {
  const user = { id: 1 } as TokenDto;

  function makeScienceProgramService(config: {
    results: any[];
    initiatives: any[];
    indicatorContributionsMap?: Map<string, any>;
    plannedKpisCountMap?: Map<string, number>;
    activeYear?: number;
  }) {
    const service: any = Object.create(ResultsService.prototype);
    service._logger = { warn: jest.fn(), error: jest.fn(), log: jest.fn() };
    service._handlersError = { returnErrorRes: jest.fn((c: any) => c.error) };
    service._versioningService = {
      $_findActivePhase: jest.fn().mockResolvedValue({ id: 2 }),
    };
    service._clarisaInitiativesRepository = {
      find: jest.fn().mockResolvedValue(config.initiatives),
    };
    service._roleByUserRepository = {
      find: jest.fn().mockResolvedValue([]),
    };
    service._customResultRepository = {
      AllResultsByRoleUserAndInitiativeFiltered: jest.fn().mockResolvedValue({
        results: config.results,
        total: config.results.length,
      }),
    };
    service._yearRepository = {
      findOne: jest.fn().mockResolvedValue({ year: config.activeYear ?? 2026 }),
    };
    service._tocResultsRepository = {
      getIndicatorContributions: jest
        .fn()
        .mockImplementation((code: string, year: number) => {
          return Promise.resolve(
            config.indicatorContributionsMap?.get(`${code}_${year}`) ??
              new Map(),
          );
        }),
      getPlannedKpisCountMap: jest.fn().mockImplementation((_year: number) => {
        return Promise.resolve(config.plannedKpisCountMap ?? new Map());
      }),
    };
    service.computeProgressValue =
      ResultsService.prototype['computeProgressValue'];
    service.calculateInitiativeProgress =
      ResultsService.prototype['calculateInitiativeProgress'];
    service.buildScienceProgramBuckets =
      ResultsService.prototype['buildScienceProgramBuckets'];

    return service;
  }

  it('aggregates plannedKpis from ToC and tallies replicatedResults vs newResults with invariant replicatedResults + newResults === totalResults', async () => {
    const initiatives = [
      {
        id: 10,
        official_code: 'INIT-01',
        name: 'Initiative 1',
        short_name: 'I1',
        portfolio_id: 3,
        active: true,
      },
    ];

    const indicatorContributions = new Map([
      ['IND-1', { target_value_sum: 10, actual_achieved_value_sum: 5 }],
      ['IND-2', { target_value_sum: 20, actual_achieved_value_sum: 20 }],
      ['IND-3', { target_value_sum: 5, actual_achieved_value_sum: 0 }],
    ]);

    const indicatorMap = new Map([['INIT-01_2026', indicatorContributions]]);

    const results = [
      {
        submitter_id: 10,
        submitter: 'INIT-01',
        submitter_name: 'Initiative 1',
        version_id: 2,
        phase_name: 'AR 2026',
        phase_year: 2026,
        status_id: 1,
        status_name: 'Editing',
        is_replicated: true,
      },
      {
        submitter_id: 10,
        submitter: 'INIT-01',
        submitter_name: 'Initiative 1',
        version_id: 2,
        phase_name: 'AR 2026',
        phase_year: 2026,
        status_id: 1,
        status_name: 'Editing',
        is_replicated: 1,
      },
      {
        submitter_id: 10,
        submitter: 'INIT-01',
        submitter_name: 'Initiative 1',
        version_id: 2,
        phase_name: 'AR 2026',
        phase_year: 2026,
        status_id: 2,
        status_name: 'Submitted',
        is_replicated: false,
      },
    ];

    const service = makeScienceProgramService({
      results,
      initiatives,
      indicatorContributionsMap: indicatorMap,
      activeYear: 2026,
    });

    const res: any = await service.getScienceProgramProgress(user, 2);

    expect(res.status).toBe(200);
    const item = res.response.otherSciencePrograms[0];
    expect(item).toBeDefined();
    expect(item.initiativeCode).toBe('INIT-01');
    expect(item.plannedKpis).toBe(3);
    expect(item.replicatedResults).toBe(2);
    expect(item.newResults).toBe(1);
    expect(item.totalResults).toBe(3);
    expect(item.replicatedResults + item.newResults).toBe(item.totalResults);

    const version = item.versions[0];
    expect(version).toBeDefined();
    expect(version.plannedKpis).toBe(3);
    expect(version.replicatedResults).toBe(2);
    expect(version.newResults).toBe(1);
    expect(version.totalResults).toBe(3);
    expect(version.replicatedResults + version.newResults).toBe(
      version.totalResults,
    );
  });

  it('handles initiative with zero results: totalResults is null, replicatedResults is 0, newResults is 0, plannedKpis populated from ToC', async () => {
    const initiatives = [
      {
        id: 20,
        official_code: 'INIT-02',
        name: 'Initiative 2',
        portfolio_id: 3,
        active: true,
      },
    ];

    const indicatorContributions = new Map([
      ['IND-1', { target_value_sum: 10, actual_achieved_value_sum: 10 }],
    ]);

    const indicatorMap = new Map([['INIT-02_2026', indicatorContributions]]);

    const service = makeScienceProgramService({
      results: [],
      initiatives,
      indicatorContributionsMap: indicatorMap,
      activeYear: 2026,
    });

    const res: any = await service.getScienceProgramProgress(user, 2);

    expect(res.status).toBe(200);
    const item = res.response.otherSciencePrograms[0];
    expect(item.plannedKpis).toBe(1);
    expect(item.totalResults).toBeNull();
    expect(item.replicatedResults).toBe(0);
    expect(item.newResults).toBe(0);
  });

  it('prefers plannedKpis from getPlannedKpisCountMap (e.g. 415 full ToC universe) when available', async () => {
    const initiatives = [
      {
        id: 10,
        official_code: 'SP01',
        name: 'Breeding for Tomorrow',
        portfolio_id: 3,
        active: true,
      },
    ];

    const plannedKpisCountMap = new Map([['SP01', 415]]);

    const service = makeScienceProgramService({
      results: [],
      initiatives,
      plannedKpisCountMap,
      activeYear: 2026,
    });

    const res: any = await service.getScienceProgramProgress(user, 2);

    expect(res.status).toBe(200);
    const item = res.response.otherSciencePrograms[0];
    expect(item.plannedKpis).toBe(415);
  });
});

describe('ResultsService — emitBilateralReviewNotification per-recipient wording (NDCW-T-1, SACN-T-2)', () => {
  const submitter = 11;
  const centerUser = 22;
  const nonRole9CenterUser = 33;
  const emitter = { id: 99 } as TokenDto;

  function makeService(opts: {
    anyRoleCenterUserIds?: number[];
    role9CenterUserIds?: number[];
    ownerLookup?: jest.Mock;
    external?: number | null;
    createdBy?: number;
    officialCode?: string | null;
  }) {
    const service: any = Object.create(ResultsService.prototype);
    service._logger = { warn: jest.fn(), error: jest.fn(), log: jest.fn() };
    service._notificationService = {
      emitResultNotification: jest.fn().mockResolvedValue(undefined),
    };
    service._resultRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 1,
        external_submitter: opts.external ?? null,
        created_by: opts.createdBy ?? submitter,
      }),
    };
    service._resultsCenterRepository = {
      getAllResultsCenterByResultId: jest
        .fn()
        .mockResolvedValue([{ is_leading_result: 1, code: 'CIMMYT' }]),
    };
    service._roleByUserRepository = {
      // SACN-R-1/DD-1 — Approve uses the any-role lookup, Reject keeps the Center-User-only one.
      getUserIdsByCenterAnyRole: jest
        .fn()
        .mockResolvedValue(opts.anyRoleCenterUserIds ?? [centerUser]),
      getUserIdsByCenter: jest
        .fn()
        .mockResolvedValue(opts.role9CenterUserIds ?? [centerUser]),
    };
    service._resultByInitiativesRepository = {
      getResultByInitiativeOwnerFull:
        opts.ownerLookup ?? jest.fn().mockResolvedValue({ inititiative_id: 3 }),
    };
    service._clarisaInitiativesRepository = {
      findOne: jest
        .fn()
        .mockResolvedValue(
          opts.officialCode === null
            ? null
            : { id: 3, official_code: opts.officialCode ?? 'SP03' },
        ),
    };
    service.getLeadCenterCode = jest.fn().mockResolvedValue('CIMMYT');
    return service;
  }

  it('approve: emits to the submitter without text and to center (any-role) users with the new SP sentence', async () => {
    const service = makeService({});

    await service.emitBilateralReviewNotification(
      1,
      ReviewDecisionEnum.APPROVE,
      emitter,
    );

    const calls =
      service._notificationService.emitResultNotification.mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0][2]).toEqual([submitter]);
    expect(calls[0][5]).toBeUndefined();
    expect(calls[1][2]).toEqual([centerUser]);
    expect(calls[1][5]).toBe(
      "SP03, as primary Science Program, has approved your center's result",
    );
  });

  // Falsifier: a non-role-9 user mocked only from the any-role lookup must still be in the
  // Approve center emit, and the any-role lookup (not `getUserIdsByCenter`) is the one used.
  it('approve: includes a non-role-9 center user returned only by the any-role lookup, and calls the any-role lookup with the lead center code only', async () => {
    const service = makeService({
      anyRoleCenterUserIds: [nonRole9CenterUser],
      role9CenterUserIds: [],
    });

    await service.emitBilateralReviewNotification(
      1,
      ReviewDecisionEnum.APPROVE,
      emitter,
    );

    expect(
      service._roleByUserRepository.getUserIdsByCenterAnyRole,
    ).toHaveBeenCalledWith('CIMMYT');
    expect(
      service._roleByUserRepository.getUserIdsByCenter,
    ).not.toHaveBeenCalled();

    const calls =
      service._notificationService.emitResultNotification.mock.calls;
    expect(calls[1][2]).toEqual([nonRole9CenterUser]);
  });

  // Falsifier: Reject must keep the legacy wording and the Center-User-only lookup — the
  // any-role lookup must NOT be called.
  it('reject: keeps the legacy center wording and calls only the Center-User-only lookup', async () => {
    const service = makeService({});

    await service.emitBilateralReviewNotification(
      1,
      ReviewDecisionEnum.REJECT,
      emitter,
    );

    expect(
      service._roleByUserRepository.getUserIdsByCenter,
    ).toHaveBeenCalledWith('CIMMYT');
    expect(
      service._roleByUserRepository.getUserIdsByCenterAnyRole,
    ).not.toHaveBeenCalled();

    const calls =
      service._notificationService.emitResultNotification.mock.calls;
    expect(calls[1][5]).toBe(
      'where your center was tagged, has been rejected by the Science Program SP03.',
    );
  });

  it('emits once, to the submitter without text, when the submitter is also returned by the any-role lookup', async () => {
    const service = makeService({ anyRoleCenterUserIds: [submitter] });

    await service.emitBilateralReviewNotification(
      1,
      ReviewDecisionEnum.APPROVE,
      emitter,
    );

    const calls =
      service._notificationService.emitResultNotification.mock.calls;
    expect(calls).toHaveLength(1);
    expect(calls[0][2]).toEqual([submitter]);
    expect(calls[0][5]).toBeUndefined();
  });

  // Falsifier: the approver, even if returned by the any-role lookup, must appear in neither emit.
  it('approve: the approver returned by the any-role lookup appears in neither the submitter nor the center emit', async () => {
    const service = makeService({
      anyRoleCenterUserIds: [centerUser, emitter.id],
    });

    await service.emitBilateralReviewNotification(
      1,
      ReviewDecisionEnum.APPROVE,
      emitter,
    );

    const calls =
      service._notificationService.emitResultNotification.mock.calls;
    for (const call of calls) {
      expect(call[2]).not.toContain(emitter.id);
    }
  });

  // SACN-R-3 scenario: primary SP code known.
  it('approve: owner code SP06 → stored center text is exactly the SP06 sentence', async () => {
    const service = makeService({ officialCode: 'SP06' });

    await service.emitBilateralReviewNotification(
      1,
      ReviewDecisionEnum.APPROVE,
      emitter,
    );

    const calls =
      service._notificationService.emitResultNotification.mock.calls;
    expect(calls[1][5]).toBe(
      "SP06, as primary Science Program, has approved your center's result",
    );
  });

  // SACN-R-3 scenario: primary SP code unknown → the no-code fallback, exactly.
  it('approve: owner code unresolved → stored center text is exactly the fallback sentence', async () => {
    const service = makeService({
      ownerLookup: jest.fn().mockResolvedValue({ inititiative_id: null }),
    });

    await service.emitBilateralReviewNotification(
      1,
      ReviewDecisionEnum.APPROVE,
      emitter,
    );

    const calls =
      service._notificationService.emitResultNotification.mock.calls;
    expect(calls[1][5]).toBe(
      "The primary Science Program has approved your center's result",
    );
  });

  it('degrades to the no-code fallback sentence and does not throw when the owner lookup fails', async () => {
    const service = makeService({
      ownerLookup: jest.fn().mockRejectedValue(new Error('db down')),
    });

    await expect(
      service.emitBilateralReviewNotification(
        1,
        ReviewDecisionEnum.APPROVE,
        emitter,
      ),
    ).resolves.toBeUndefined();

    const calls =
      service._notificationService.emitResultNotification.mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[1][5]).toBe(
      "The primary Science Program has approved your center's result",
    );
  });

  // SACN-R-8 scenario: the center-roles lookup throws → the submitter is still notified, no throw.
  it('approve: the any-role lookup throwing still lets the submitter emit happen, and does not throw', async () => {
    const service = makeService({});
    service._roleByUserRepository.getUserIdsByCenterAnyRole = jest
      .fn()
      .mockRejectedValue(new Error('db down'));

    await expect(
      service.emitBilateralReviewNotification(
        1,
        ReviewDecisionEnum.APPROVE,
        emitter,
      ),
    ).resolves.toBeUndefined();

    const calls =
      service._notificationService.emitResultNotification.mock.calls;
    expect(calls).toHaveLength(1);
    expect(calls[0][2]).toEqual([submitter]);
    expect(calls[0][5]).toBeUndefined();
  });

  // SACN-R-1 scenario: no lead center flagged → only the submitter is notified.
  it('no lead center → only the submitter is notified, approval unaffected', async () => {
    const service = makeService({});
    service.getLeadCenterCode = jest.fn().mockResolvedValue(null);

    await service.emitBilateralReviewNotification(
      1,
      ReviewDecisionEnum.APPROVE,
      emitter,
    );

    expect(
      service._roleByUserRepository.getUserIdsByCenterAnyRole,
    ).not.toHaveBeenCalled();
    const calls =
      service._notificationService.emitResultNotification.mock.calls;
    expect(calls).toHaveLength(1);
    expect(calls[0][2]).toEqual([submitter]);
  });
});

/**
 * `PNS-T-2` (requirements.md `PNS-R-2` second `AND IT MUST`, design.md `PNS-DD-4` reversion
 * challenge) — a bilateral result that reached Pending Review ownerless (`PNS-R-2`'s
 * submit-sends-the-request path) is hidden from every SP review list (owner-based queries), but
 * nothing stopped a platform admin from opening it directly and approving/rejecting it, which
 * would dereference an owner that does not exist yet. `reviewBilateralResult` now refuses with
 * 400 "This result is awaiting the primary Science Program's acceptance." until the primary
 * accepts — `assertDecision` is mocked to always allow here (its own admin/role logic is
 * `bilateral-access.service.spec.ts`'s territory), so this guard is proved independent of role.
 */
describe('ResultsService — reviewBilateralResult owner guard (PNS-T-2)', () => {
  const user: TokenDto = { id: 7 } as TokenDto;

  function makeService(config: {
    status_id?: number;
    owner?: { id: number } | null;
  }) {
    const service: any = Object.create(ResultsService.prototype);
    const pendingResult = {
      id: 42,
      source: SourceEnum.Bilateral,
      is_active: true,
      status_id: config.status_id ?? ResultStatusData.PendingReview.value,
    };
    const fakeManager = {
      findOne: jest.fn().mockResolvedValue(pendingResult),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn((_entity: unknown, payload: unknown) => payload),
      save: jest.fn().mockResolvedValue({}),
    };
    service._dataSource = {
      transaction: jest.fn(async (cb: any) => cb(fakeManager)),
    };
    service._bilateralAccessService = {
      assertDecision: jest.fn().mockResolvedValue(undefined),
    };
    service._resultByInitiativesRepository = {
      getOwnerInitiativeByResult: jest
        .fn()
        .mockResolvedValue(config.owner ?? null),
    };
    service._handlersError = {
      returnErrorRes: jest.fn((c: any) => c.error),
    };
    service.emitBilateralReviewNotification = jest
      .fn()
      .mockResolvedValue(undefined);
    service.enqueueBilateralWebhook = jest.fn().mockResolvedValue(undefined);
    service._shareResultRequestRepository = {
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
    };
    service._updateTocMapping = jest.fn().mockResolvedValue(undefined);
    return { service, fakeManager };
  }

  // `Fails if`-style falsifier: on today's (pre-T-2) code there is no owner check at all, so
  // an ownerless Pending Review result approves successfully instead of refusing. Red first.
  it('no owner on a Pending Review result → 400 with the exact PNS-R-2 text, APPROVE decision, no status update committed', async () => {
    const { service, fakeManager } = makeService({ owner: null });

    const res = await service.reviewBilateralResult(
      42,
      { decision: ReviewDecisionEnum.APPROVE },
      user,
    );

    expect(res.status).toBe(400);
    expect(res.message).toBe(
      "This result is awaiting the primary Science Program's acceptance.",
    );
    expect(fakeManager.update).not.toHaveBeenCalled();
    expect(service.emitBilateralReviewNotification).not.toHaveBeenCalled();
  });

  it('no owner on a Pending Review result → same refusal on a REJECT decision too', async () => {
    const { service } = makeService({ owner: null });

    const res = await service.reviewBilateralResult(
      42,
      { decision: ReviewDecisionEnum.REJECT, justification: 'not relevant' },
      user,
    );

    expect(res.status).toBe(400);
    expect(res.message).toBe(
      "This result is awaiting the primary Science Program's acceptance.",
    );
  });

  it('an owner exists → the guard does not interfere; approval proceeds', async () => {
    const { service, fakeManager } = makeService({ owner: { id: 9 } });

    const res = await service.reviewBilateralResult(
      42,
      { decision: ReviewDecisionEnum.APPROVE },
      user,
    );

    expect(res.status).toBe(200);
    expect(fakeManager.update).toHaveBeenCalledWith(
      expect.anything(),
      { id: 42 },
      expect.objectContaining({ status_id: ResultStatusData.Approved.value }),
    );
  });
  // RSB-R-18 — every decision records the deciding SP (the owner) in the history.
  it('REJECT decision → the history row carries action REJECT, the justification and initiative_id = owner', async () => {
    const { service, fakeManager } = makeService({ owner: { id: 9 } });

    await service.reviewBilateralResult(
      42,
      { decision: ReviewDecisionEnum.REJECT, justification: 'not relevant' },
      user,
    );

    expect(fakeManager.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        result_id: 42,
        action: 'REJECT',
        comment: 'not relevant',
        initiative_id: 9,
        created_by: 7,
      }),
    );
  });

  it('APPROVE decision with no justification still writes the entry (comment null) with initiative_id = owner', async () => {
    const { service, fakeManager } = makeService({ owner: { id: 9 } });

    await service.reviewBilateralResult(
      42,
      { decision: ReviewDecisionEnum.APPROVE, justification: null },
      user,
    );

    expect(fakeManager.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'APPROVE',
        comment: null,
        initiative_id: 9,
      }),
    );
    expect(fakeManager.save).toHaveBeenCalled();
  });
});
