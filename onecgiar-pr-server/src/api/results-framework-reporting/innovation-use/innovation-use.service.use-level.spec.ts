import { InnovationUseService } from './innovation-use.service';

/**
 * The innovation use LEVEL is optional (bilateral API since P2-3785). An absent level must be
 * stored as NULL — never as catalogue row 1 (level 0, "Innovation is not used").
 *
 * The bug this pins: `findOne({ where: { level: null } })` — TypeORM drops a `null` condition
 * from WHERE, so the lookup returned the FIRST catalogue row and every result sent without a
 * level read "No use" next to its user numbers (reported by the Bulk Uploader, 2026-10-13).
 *
 * Built off the prototype, same shape as `innovation-use.service.current-use-update.spec.ts`.
 */
describe('InnovationUseService — optional innovation use level', () => {
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

  const savedRow = (service: any) =>
    service._resultsInnovationsUseRepository.save.mock.calls.at(-1)?.[0];

  it.each([
    ['absent', {}],
    ['null', { innovation_use_level_id: null }],
  ])(
    'stores NULL and never queries the catalogue when the level is %s (existing row)',
    async (_label, over) => {
      const service = makeService({ result_innovation_use_id: 1 });

      await service.saveInnovationUse(
        { has_innovation_link: false, ...over } as any,
        RESULT_ID,
        USER,
      );

      expect(
        service._clarisaInnovationUseLevelRepository.findOne,
      ).not.toHaveBeenCalled();
      expect(savedRow(service).innovation_use_level_id).toBeNull();
    },
  );

  it('stores NULL on a brand-new row too (first save without a level)', async () => {
    const service = makeService(null);

    await service.saveInnovationUse(
      { has_innovation_link: false } as any,
      RESULT_ID,
      USER,
    );

    expect(
      service._clarisaInnovationUseLevelRepository.findOne,
    ).not.toHaveBeenCalled();
    expect(savedRow(service).innovation_use_level_id).toBeNull();
  });

  it('still resolves level 0 through the catalogue — 0 is a real answer, not "absent"', async () => {
    const service = makeService({ result_innovation_use_id: 1 });
    service._clarisaInnovationUseLevelRepository.findOne.mockResolvedValue({
      id: 1,
    });

    await service.saveInnovationUse(
      { has_innovation_link: false, innovation_use_level_id: 0 } as any,
      RESULT_ID,
      USER,
    );

    expect(
      service._clarisaInnovationUseLevelRepository.findOne,
    ).toHaveBeenCalledWith(expect.objectContaining({ where: { level: 0 } }));
    expect(savedRow(service).innovation_use_level_id).toBe(1);
  });

  it('still rejects a level that is not in the catalogue', async () => {
    const service = makeService({ result_innovation_use_id: 1 });
    service._clarisaInnovationUseLevelRepository.findOne.mockResolvedValue(
      null,
    );

    await expect(
      service.saveInnovationUse(
        { has_innovation_link: false, innovation_use_level_id: 42 } as any,
        RESULT_ID,
        USER,
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(
      service._resultsInnovationsUseRepository.save,
    ).not.toHaveBeenCalled();
  });
});
