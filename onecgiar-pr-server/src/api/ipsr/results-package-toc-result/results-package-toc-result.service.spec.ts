import { HttpStatus } from '@nestjs/common';
import { ResultsPackageTocResultService } from './results-package-toc-result.service';

// WCT-T-3 (docs/specs/notifications/w1w2-center-tagged, WCT-R-2 — A-1
// reverted, Pivot WCT-T-2 2026-09-30): IPSR contributors save notifies every
// newly saved Center (primary included) via ResultTaggedNotificationService.
// This spec covers only the notification hook in `create`, with every
// repository/service dependency mocked. It does not re-test the rest of
// `create`'s behavior.
describe('ResultsPackageTocResultService — tagged-centre notifications (WCT-T-3)', () => {
  let service: ResultsPackageTocResultService;

  const mockNonPooledProjectRepository = {
    updateNPProjectById: jest.fn().mockResolvedValue(undefined),
    find: jest.fn().mockResolvedValue([]),
  };
  const mockResultsCenterRepository = {
    updateCenter: jest.fn().mockResolvedValue(undefined),
    getAllResultsCenterByResultIdAndCenterId: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockResolvedValue({ id: 1 }),
    update: jest.fn().mockResolvedValue(undefined),
  };
  const mockResultByInitiativesRepository = {};
  const mockResultsTocResultRepository = {};
  const mockResultByIntitutionsRepository = {
    updateInstitutions: jest.fn().mockResolvedValue(undefined),
  };
  const mockResultByInstitutionsByDeliveriesTypeRepository = {};
  const mockResultIpEoiOutcomesRepository = {};
  const mockShareResultRequestService = {};
  const mockShareResultRequestRepository = {};
  const mockResultRepository = {
    getResultById: jest.fn(),
  };
  const mockVersionsService = {};
  const mockIpsrRepository = {
    findOne: jest.fn(),
  };
  const mockHandlersError = {
    returnErrorRes: jest.fn((payload) => payload),
  };
  const mockReturnResponse = {};
  const mockVersioningService = {
    $_findActivePhase: jest.fn(),
  };
  const mockResultTocResultService = {
    saveResultTocResultPrimary: jest.fn().mockResolvedValue(undefined),
    saveResultTocResultContributor: jest.fn().mockResolvedValue(undefined),
  };
  const mockResultBilateralBudgetRepository = {};
  const mockResultInstitutionsBudgetRepository = {};
  const mockResultTaggedNotificationService = {
    notifyTaggedCenters: jest.fn().mockResolvedValue(undefined),
  };

  const createService = () =>
    new ResultsPackageTocResultService(
      mockNonPooledProjectRepository as any,
      mockResultsCenterRepository as any,
      mockResultByInitiativesRepository as any,
      mockResultsTocResultRepository as any,
      mockResultByIntitutionsRepository as any,
      mockResultByInstitutionsByDeliveriesTypeRepository as any,
      mockResultIpEoiOutcomesRepository as any,
      mockShareResultRequestService as any,
      mockShareResultRequestRepository as any,
      mockResultRepository as any,
      mockVersionsService as any,
      mockIpsrRepository as any,
      mockHandlersError as any,
      mockReturnResponse as any,
      mockVersioningService as any,
      mockResultTocResultService as any,
      mockResultBilateralBudgetRepository as any,
      mockResultInstitutionsBudgetRepository as any,
      mockResultTaggedNotificationService as any,
    );

  const baseUser = { id: 7 } as any;
  const rip = { id: 9500 };
  const result = { id: 100 };

  const baseDto = (contributing_center: any[]) => ({
    result_id: 9500,
    contributing_center,
    result_toc_result: { result_toc_results: [] },
    contributors_result_toc_result: [],
    institutions: [],
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockResultRepository.getResultById
      .mockReset()
      .mockResolvedValueOnce(rip)
      .mockResolvedValueOnce(result);
    mockIpsrRepository.findOne.mockResolvedValue({
      result_innovation_package_id: 1,
      result_id: result.id,
    });
    mockVersioningService.$_findActivePhase.mockResolvedValue({ id: 1 });
    mockResultsCenterRepository.getAllResultsCenterByResultIdAndCenterId.mockResolvedValue(
      null,
    );
    mockResultTaggedNotificationService.notifyTaggedCenters.mockResolvedValue(
      undefined,
    );
    service = createService();
  });

  // Pivot (Leader correction, 2026-09-30, D-1/A-1 reverted): no `primary`
  // filter — every newly saved row is recorded, primary or not. Only
  // already-existing rows are excluded.
  it('notifies every newly-saved Center code, primary or not (WCT-R-2 pivot)', async () => {
    const dto = baseDto([
      { code: 'ABC', primary: false },
      { code: 'XYZ', primary: true },
    ]);

    const response = await service.create(dto as any, baseUser);

    expect(
      mockResultTaggedNotificationService.notifyTaggedCenters,
    ).toHaveBeenCalledWith(rip.id, baseUser.id, ['ABC', 'XYZ']);
    expect((response as any).status).toBe(HttpStatus.CREATED);
  });

  it('excludes an already-existing Center but still notifies the new one', async () => {
    mockResultsCenterRepository.getAllResultsCenterByResultIdAndCenterId
      .mockReset()
      .mockResolvedValueOnce({ id: 1, center_id: 'ABC' }) // ABC already linked
      .mockResolvedValueOnce(null); // XYZ is new

    const dto = baseDto([
      { code: 'ABC', primary: false },
      { code: 'XYZ', primary: true },
    ]);

    await service.create(dto as any, baseUser);

    expect(
      mockResultTaggedNotificationService.notifyTaggedCenters,
    ).toHaveBeenCalledWith(rip.id, baseUser.id, ['XYZ']);
  });

  it('does not notify when every Center was already linked', async () => {
    mockResultsCenterRepository.getAllResultsCenterByResultIdAndCenterId.mockResolvedValue(
      { id: 1, center_id: 'ABC' },
    );

    const dto = baseDto([{ code: 'ABC', primary: false }]);

    await service.create(dto as any, baseUser);

    expect(
      mockResultTaggedNotificationService.notifyTaggedCenters,
    ).not.toHaveBeenCalled();
  });

  it('does not fail the save when the emitter rejects (WCT-NFR-1)', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockResultTaggedNotificationService.notifyTaggedCenters.mockRejectedValueOnce(
      new Error('socket down'),
    );

    const dto = baseDto([{ code: 'ABC', primary: false }]);

    const response = await service.create(dto as any, baseUser);

    expect((response as any).status).toBe(HttpStatus.CREATED);
    expect(
      mockResultTaggedNotificationService.notifyTaggedCenters,
    ).toHaveBeenCalledWith(rip.id, baseUser.id, ['ABC']);
  });

  it('calls the emitter only after the center save has resolved (call order)', async () => {
    // Pushes 'save' only after an async tick, so that dropping the `await`
    // on the center `save(...)` call in production would let the loop (and
    // the notify call after it) run before this resolves — making this
    // assertion a real falsifier of missing-`await`, not just a same-tick
    // call-order check.
    const order: string[] = [];
    mockResultsCenterRepository.save.mockImplementation(async () => {
      await Promise.resolve();
      order.push('save');
      return { id: 1 };
    });
    mockResultTaggedNotificationService.notifyTaggedCenters.mockImplementation(
      async () => {
        order.push('notify');
      },
    );

    const dto = baseDto([{ code: 'ABC', primary: false }]);

    await service.create(dto as any, baseUser);

    expect(order).toEqual(['save', 'notify']);
  });
});
