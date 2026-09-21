import { ResultsService } from './results.service';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { ResultTypeEnum } from '../../shared/constants/result-type.enum';
import { MWB_COMPLETENESS_CAP } from './results-validation-module/completeness';

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
