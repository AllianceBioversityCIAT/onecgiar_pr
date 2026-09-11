import { InnovationUseService } from './innovation-use.service';

/**
 * P2-3537 §4/§5 — persisting the increment and its narrative, through the REAL `saveInnovationUse`.
 *
 * Deliberately not a spec that re-implements the assignment and asserts on its own copy: that
 * proves nothing about the service. This one calls the method and reads what reached `save()`.
 *
 * What it pins is the difference between "not answered" and "answered zero", which is the whole
 * reason both columns are nullable with no default. §5 allows a reported **0** explicitly ("use was
 * verified and did not grow"), and that has to survive as 0, not as NULL. Writing `|| null`
 * instead of `?? null` turns that statement into "never answered", and nothing would complain.
 *
 * Built off the prototype because the constructor is enormous — same shape as the sibling specs.
 */
describe('InnovationUseService — Current Use Update persistence (P2-3537)', () => {
  const USER = { id: 7 } as any;
  const RESULT_ID = 41;

  function makeService(existingRow: any) {
    const service: any = Object.create(InnovationUseService.prototype);
    service.logger = { error: jest.fn(), warn: jest.fn(), log: jest.fn() };

    service._resultsInnovationsUseRepository = {
      findOne: jest.fn().mockResolvedValue(existingRow),
      InnovUseExists: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation((row: any) => Promise.resolve(row)),
    };
    service._clarisaInnovationUseLevelRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 3, level: '3' }),
    };
    service._resultRepository = { update: jest.fn() };
    // Rethrows on purpose: the service swallows everything into `returnErrorRes`, so a silent
    // collaborator gap would make these tests pass on an empty `save()` call list.
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
    // The investment writers have their own paths; stubbed so this spec stays on the two columns.
    service._linkedResultService = {
      createForInnovationUse: jest.fn().mockResolvedValue(undefined),
    };
    service.syncBudgetForResults = jest.fn().mockResolvedValue(undefined);
    service.saveInitiativeInvestment = jest.fn().mockResolvedValue(undefined);
    service.saveBilateralInvestment = jest.fn().mockResolvedValue(undefined);
    service.savePartnerInvestment = jest.fn().mockResolvedValue(undefined);
    // The two section writers are exercised by their own specs; here they must not run.
    service.saveAnticipatedInnoUser = jest.fn().mockResolvedValue(undefined);
    service.getInnovationUse = jest
      .fn()
      .mockResolvedValue({ response: {}, message: 'ok', status: 200 });
    return service;
  }

  const dto = (over: Record<string, unknown> = {}) =>
    ({
      innovation_use_level_id: 3,
      has_innovation_link: false,
      ...over,
    }) as any;

  /** The row handed to `save()` — what actually reaches the database. */
  const savedRow = (service: any) =>
    service._resultsInnovationsUseRepository.save.mock.calls.at(-1)?.[0];

  it('stores a reported increment and its narrative on the existing row', async () => {
    const service = makeService({ result_innovation_use_id: 1 });

    await service.saveInnovationUse(
      dto({
        new_users_added: 120,
        use_expansion_narrative:
          'A distribution agreement with two cooperatives.',
      }),
      RESULT_ID,
      USER,
    );

    const row = savedRow(service);
    expect(row.new_users_added).toBe(120);
    expect(row.use_expansion_narrative).toBe(
      'A distribution agreement with two cooperatives.',
    );
  });

  it('keeps a reported ZERO as zero, never as "not answered"', async () => {
    // §5: "New users added = 0" is allowed and still demands evidence and a narrative — the
    // reporter is stating that use was verified and did not grow. NULL would lose that statement.
    const service = makeService({ result_innovation_use_id: 1 });

    await service.saveInnovationUse(
      dto({
        new_users_added: 0,
        use_expansion_narrative: 'Verified with the cooperative; no new users.',
      }),
      RESULT_ID,
      USER,
    );

    const row = savedRow(service);
    expect(row.new_users_added).toBe(0);
    expect(row.new_users_added).not.toBeNull();
  });

  it('stores null when the question was never answered', async () => {
    const service = makeService({ result_innovation_use_id: 1 });

    await service.saveInnovationUse(dto(), RESULT_ID, USER);

    const row = savedRow(service);
    expect(row.new_users_added).toBeNull();
    expect(row.use_expansion_narrative).toBeNull();
  });

  it('starts a brand-new row at null instead of inheriting anything', async () => {
    // The phase rollover INSERTs a fresh row and does not copy these columns, so a new cycle must
    // start empty. This asserts the service does not reintroduce a value from anywhere.
    const service = makeService(null);

    await service.saveInnovationUse(dto(), RESULT_ID, USER);

    const row = savedRow(service);
    expect(row.new_users_added).toBeNull();
    expect(row.use_expansion_narrative).toBeNull();
  });

  it('writes the increment on a new row when it is reported on first save', async () => {
    const service = makeService(null);

    await service.saveInnovationUse(
      dto({ new_users_added: 45, use_expansion_narrative: 'Radio programme.' }),
      RESULT_ID,
      USER,
    );

    const row = savedRow(service);
    expect(row.new_users_added).toBe(45);
    expect(row.use_expansion_narrative).toBe('Radio programme.');
  });

  it('replaces the figure of THIS cycle when the reporter corrects it', async () => {
    // Within one cycle a second figure is a correction, not history — which is why one column per
    // phase is enough and no child table was needed.
    const service = makeService({
      result_innovation_use_id: 1,
      new_users_added: 80,
    });

    await service.saveInnovationUse(
      dto({ new_users_added: 120 }),
      RESULT_ID,
      USER,
    );

    expect(savedRow(service).new_users_added).toBe(120);
  });
});
