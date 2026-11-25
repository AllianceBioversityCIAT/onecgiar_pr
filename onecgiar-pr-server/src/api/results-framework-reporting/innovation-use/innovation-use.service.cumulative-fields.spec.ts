import { InnovationUseService } from './innovation-use.service';

/**
 * IU26-R-2 / DD-6 — the cumulative fields (`new_users_added`, `use_expansion_narrative`) are never
 * erased for a 2026+ result: an omitted or null value keeps what is stored. Earlier phases keep
 * today's write (`?? null`), so a pre-2026 reporter can still clear them.
 *
 * Built off the prototype, same shape as `innovation-use.service.use-level.spec.ts`.
 */
describe('InnovationUseService — cumulative fields kept for 2026 (IU26-R-2)', () => {
  const USER = { id: 7 } as any;
  const RESULT_ID = 41;

  const storedRow = (phaseYear: number) => ({
    result_innovation_use_id: 1,
    new_users_added: 845,
    use_expansion_narrative: 'stored narrative',
    obj_result: { obj_version: { phase_year: phaseYear } },
  });

  function makeService(existingRow: any, fallbackRow: any = null) {
    const service: any = Object.create(InnovationUseService.prototype);
    service.logger = { error: jest.fn(), warn: jest.fn(), log: jest.fn() };
    service._resultsInnovationsUseRepository = {
      findOne: jest.fn().mockResolvedValue(existingRow),
      InnovUseExists: jest.fn().mockResolvedValue(fallbackRow),
      save: jest.fn().mockImplementation((row: any) => Promise.resolve(row)),
    };
    service._clarisaInnovationUseLevelRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 3, level: '3' }),
    };
    service._resultRepository = { update: jest.fn() };
    service._handlersError = {
      returnErrorRes: jest.fn().mockImplementation(({ error }) => {
        throw error;
      }),
    };
    service._resultScalingStudyUrlsRepository = {
      update: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };
    service._resultsInvestmentDiscontinuedOptionRepository = {
      inactiveData: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      save: jest.fn(),
    };
    service._linkedResultService = {
      createForInnovationUse: jest.fn().mockResolvedValue(undefined),
    };
    service.syncBudgetForResults = jest.fn().mockResolvedValue(undefined);
    service.saveInitiativeInvestment = jest.fn().mockResolvedValue(undefined);
    service.saveBilateralInvestment = jest.fn().mockResolvedValue(undefined);
    service.savePartnerInvestment = jest.fn().mockResolvedValue(undefined);
    service.saveAnticipatedInnoUser = jest.fn().mockResolvedValue(undefined);
    service.getInnovationUse = jest
      .fn()
      .mockResolvedValue({ response: {}, message: 'ok', status: 200 });
    return service;
  }

  const savedRow = (service: any) =>
    service._resultsInnovationsUseRepository.save.mock.calls.at(-1)?.[0];

  const save = (service: any, dto: any) =>
    service.saveInnovationUse(
      { has_innovation_link: false, ...dto },
      RESULT_ID,
      USER,
    );

  it('cumulative: 2026 result, keys omitted -> stored values kept', async () => {
    const service = makeService(storedRow(2026));
    await save(service, {});
    expect(savedRow(service).new_users_added).toBe(845);
    expect(savedRow(service).use_expansion_narrative).toBe('stored narrative');
  });

  it('cumulative: 2026 result, explicit null -> stored values kept', async () => {
    const service = makeService(storedRow(2026));
    await save(service, {
      new_users_added: null,
      use_expansion_narrative: null,
    });
    expect(savedRow(service).new_users_added).toBe(845);
    expect(savedRow(service).use_expansion_narrative).toBe('stored narrative');
  });

  it('cumulative: 2025 result, explicit null -> cleared as today', async () => {
    const service = makeService(storedRow(2025));
    await save(service, {
      new_users_added: null,
      use_expansion_narrative: null,
    });
    expect(savedRow(service).new_users_added).toBeNull();
    expect(savedRow(service).use_expansion_narrative).toBeNull();
  });

  it('cumulative: 2025 result, keys omitted -> cleared as today', async () => {
    const service = makeService(storedRow(2025));
    await save(service, {});
    expect(savedRow(service).new_users_added).toBeNull();
    expect(savedRow(service).use_expansion_narrative).toBeNull();
  });

  it.each([
    ['a number', { new_users_added: 12 }, 12],
    ['zero (a real answer)', { new_users_added: 0 }, 0],
  ])('cumulative: 2026 result, %s -> written', async (_l, dto, expected) => {
    const service = makeService(storedRow(2026));
    await save(service, dto);
    expect(savedRow(service).new_users_added).toBe(expected);
  });

  it('cumulative: 2026 result, empty-string narrative -> written (clearing works)', async () => {
    const service = makeService(storedRow(2026));
    await save(service, { use_expansion_narrative: '' });
    expect(savedRow(service).use_expansion_narrative).toBe('');
  });

  it('cumulative: 2026 result found through InnovUseExists (flat phase_year) -> kept', async () => {
    const fallback = {
      result_innovation_use_id: 1,
      new_users_added: 845,
      use_expansion_narrative: 'stored narrative',
      phase_year: 2026,
    };
    const service = makeService(null, fallback);
    await save(service, { new_users_added: null });
    expect(savedRow(service).new_users_added).toBe(845);
  });
});
