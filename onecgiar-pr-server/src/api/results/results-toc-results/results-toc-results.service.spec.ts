import { Test, TestingModule } from '@nestjs/testing';
import { In, Not } from 'typeorm';
import { ResultsTocResultsService } from './results-toc-results.service';
import { ResultsTocResultRepository } from './repositories/results-toc-results.repository';
import { ResultByInitiativesRepository } from '../results_by_inititiatives/resultByInitiatives.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultRepository } from '../result.repository';
import { ResultsImpactAreaTargetRepository } from '../results-impact-area-target/results-impact-area-target.repository';
import { ResultsImpactAreaIndicatorRepository } from '../results-impact-area-indicators/results-impact-area-indicators.repository';
import { ClarisaImpactAreaRepository } from '../../../clarisa/clarisa-impact-area/ClarisaImpactArea.repository';
import { ShareResultRequestService } from '../share-result-request/share-result-request.service';
import { ShareResultRequestRepository } from '../share-result-request/share-result-request.repository';
import { ClarisaInitiativesRepository } from '../../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { EmailNotificationManagementService } from '../../../shared/microservices/email-notification-management/email-notification-management.service';
import { TemplateRepository } from '../../platform-report/repositories/template.repository';
import { RoleByUserRepository } from '../../../auth/modules/role-by-user/RoleByUser.repository';
import { UserNotificationSettingRepository } from '../../user-notification-settings/user-notification-settings.repository';
import { GlobalParameterRepository } from '../../global-parameter/repositories/global-parameter.repository';
import { TocResultsRepository } from '../../../toc/toc-results/toc-results.repository';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';

describe('ResultsTocResultsService', () => {
  let service: ResultsTocResultsService;
  let resultsTocResultRepository: jest.Mocked<ResultsTocResultRepository>;
  let resultByInitiativesRepository: jest.Mocked<ResultByInitiativesRepository>;
  let resultRepository: jest.Mocked<ResultRepository>;
  let shareResultRequestRepository: jest.Mocked<ShareResultRequestRepository>;
  let shareResultRequestService: jest.Mocked<ShareResultRequestService>;
  let tocResultsRepository: jest.Mocked<TocResultsRepository>;

  beforeEach(async () => {
    const resultsTocResultRepositoryMock: Partial<
      jest.Mocked<ResultsTocResultRepository>
    > = {
      find: jest.fn().mockResolvedValue([
        {
          result_toc_result_id: 10350,
          result_id: 1,
          initiative_ids: 50,
          is_active: true,
        },
      ]),
      update: jest.fn().mockResolvedValue(undefined),
      insert: jest.fn().mockResolvedValue({ identifiers: [] }),
      save: jest.fn().mockImplementation(async (payload) => ({
        ...payload,
        result_toc_result_id: 2048,
      })),
      findOne: jest.fn().mockImplementation(async (options: any) => {
        if (
          options?.where?.result_toc_result_id &&
          Number(options.where.result_toc_result_id) === 10350
        ) {
          return {
            result_toc_result_id: 10350,
            initiative_ids: 50,
            result_id: 1,
          } as any;
        }
        return null;
      }),
      findBy: jest.fn().mockResolvedValue([]),
      getRTRById: jest.fn().mockResolvedValue({
        result_toc_result_id: 2010,
      } as any),
      getRTRPrimary: jest.fn().mockResolvedValue([]),
      saveIndicatorsPrimarySubmitter: jest.fn().mockResolvedValue(undefined),
      saveIndicatorsContributors: jest.fn().mockResolvedValue(undefined),
      deactivateChildrenForParents: jest.fn().mockResolvedValue(undefined),
    };

    const resultByInitiativesRepositoryMock: Partial<
      jest.Mocked<ResultByInitiativesRepository>
    > = {
      findOne: jest.fn().mockResolvedValue({ initiative_id: 50 } as any),
      updateIniciativeSubmitter: jest.fn(),
      updateResultByInitiative: jest.fn().mockResolvedValue([]),
      upsertContributorInitiatives: jest.fn().mockResolvedValue(undefined),
      updateInitiativeFromTocFlags: jest.fn().mockResolvedValue(undefined),
      getContributorInitiativeByResult: jest.fn().mockResolvedValue([]),
      getPendingInit: jest.fn().mockResolvedValue([]),
      getDraftInit: jest.fn().mockResolvedValue([]),
      getContributorInitiativeAndPrimaryByResult: jest
        .fn()
        .mockResolvedValue([]),
      findBy: jest.fn().mockResolvedValue([]),
    };

    const resultRepositoryMock: Partial<jest.Mocked<ResultRepository>> = {
      getResultById: jest.fn().mockResolvedValue({
        id: 1,
        result_level_id: 3,
        initiative_id: 50,
      } as any),
      // Default: no version_id resolved on the mocked result -> not P25-onward
      // (BIL-RTE-DD-6 treats a null portfolio/version as false). Tests for the
      // P25-onward branch override getResultById AND this mock explicitly.
      getPortfolioStartYearByVersionId: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultsTocResultsService,
        {
          provide: ResultsTocResultRepository,
          useValue: resultsTocResultRepositoryMock,
        },
        {
          provide: ResultByInitiativesRepository,
          useValue: resultByInitiativesRepositoryMock,
        },
        { provide: HandlersError, useValue: { returnErrorRes: jest.fn() } },
        { provide: ResultRepository, useValue: resultRepositoryMock },
        { provide: ResultsImpactAreaTargetRepository, useValue: {} },
        { provide: ResultsImpactAreaIndicatorRepository, useValue: {} },
        { provide: ClarisaImpactAreaRepository, useValue: {} },
        {
          provide: ShareResultRequestService,
          useValue: { resultRequest: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: ShareResultRequestRepository,
          useValue: {
            cancelRequest: jest.fn().mockResolvedValue(undefined),
            updateFromTocByResultAndInitiative: jest
              .fn()
              .mockResolvedValue(undefined),
          },
        },
        { provide: ClarisaInitiativesRepository, useValue: {} },
        { provide: EmailNotificationManagementService, useValue: {} },
        { provide: TemplateRepository, useValue: {} },
        { provide: RoleByUserRepository, useValue: {} },
        { provide: UserNotificationSettingRepository, useValue: {} },
        { provide: GlobalParameterRepository, useValue: {} },
        {
          provide: TocResultsRepository,
          useValue: {
            getCatalogTargetsByIndicatorNodeIds: jest
              .fn()
              .mockResolvedValue([]),
            getTocIndicatorsByResultIds: jest.fn().mockResolvedValue([]),
            getTocResultTypologyVerdicts: jest
              .fn()
              .mockResolvedValue(new Map()),
          },
        },
      ],
    }).compile();

    service = module.get(ResultsTocResultsService);
    resultsTocResultRepository = module.get(
      ResultsTocResultRepository,
    ) as jest.Mocked<ResultsTocResultRepository>;
    resultByInitiativesRepository = module.get(
      ResultByInitiativesRepository,
    ) as jest.Mocked<ResultByInitiativesRepository>;
    resultRepository = module.get(
      ResultRepository,
    ) as jest.Mocked<ResultRepository>;
    shareResultRequestRepository = module.get(
      ShareResultRequestRepository,
    ) as jest.Mocked<ShareResultRequestRepository>;
    shareResultRequestService = module.get(
      ShareResultRequestService,
    ) as jest.Mocked<ShareResultRequestService>;
    tocResultsRepository = module.get(
      TocResultsRepository,
    ) as jest.Mocked<TocResultsRepository>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('syncs indicators and targets when payload includes indicator data', async () => {
    const payload: any = {
      result_id: 1,
      changePrimaryInit: 50,
      result_toc_result: {
        planned_result: true,
        initiative_id: 50,
        result_toc_results: [
          {
            result_toc_result_id: 10350,
            toc_result_id: 6286,
            initiative_id: 50,
            planned_result: true,
            toc_level_id: 1,
            indicators: [
              {
                toc_results_indicator_id: 'indicator-1',
                targets: [
                  {
                    indicators_targets: 1048,
                    number_target: 5,
                  },
                ],
              },
            ],
          },
        ],
      },
      contributors_result_toc_result: [
        {
          initiative_id: 51,
          planned_result: true,
          result_toc_results: [
            {
              result_toc_result_id: 2010,
              toc_result_id: 9999,
              initiative_id: 51,
              indicators: [
                {
                  toc_results_indicator_id: 'indicator-2',
                  targets: [],
                },
              ],
            },
          ],
        },
      ],
    };

    resultByInitiativesRepository.findOne.mockResolvedValueOnce({
      initiative_id: 50,
    } as any);

    await service.createTocMappingV2(payload, { id: 1 } as TokenDto);

    expect(
      resultsTocResultRepository.saveIndicatorsPrimarySubmitter,
    ).toHaveBeenCalledWith(expect.objectContaining({ result_id: 1 }), 1, 1);
    expect(
      resultsTocResultRepository.saveIndicatorsContributors,
    ).toHaveBeenCalledWith(expect.objectContaining({ result_id: 1 }), 1, 1);
    expect(resultRepository.getResultById).toHaveBeenCalledWith(1);
    expect(
      resultByInitiativesRepository.updateResultByInitiative,
    ).toHaveBeenCalled();
    expect(shareResultRequestRepository.cancelRequest).not.toHaveBeenCalled();
    expect(shareResultRequestService.resultRequest).not.toHaveBeenCalled();
  });

  it('persists contributing_indicator including zero for qualitative targets (P2-3089)', async () => {
    const payload: any = {
      result_id: 1,
      changePrimaryInit: 50,
      result_toc_result: {
        planned_result: true,
        initiative_id: 50,
        result_toc_results: [
          {
            result_toc_result_id: 10350,
            toc_result_id: 6286,
            initiative_id: 50,
            planned_result: true,
            toc_level_id: 1,
            indicators: [
              {
                toc_results_indicator_id: 'indicator-1',
                targets: [
                  {
                    indicators_targets: 1048,
                    number_target: 5,
                    contributing_indicator: 0,
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    resultByInitiativesRepository.findOne.mockResolvedValueOnce({
      initiative_id: 50,
    } as any);

    await service.createTocMappingV2(payload, { id: 1 } as TokenDto);

    expect(
      resultsTocResultRepository.saveIndicatorsPrimarySubmitter,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        result_toc_result: expect.objectContaining({
          result_toc_results: [
            expect.objectContaining({
              indicators: [
                expect.objectContaining({
                  targets: [
                    expect.objectContaining({ contributing_indicator: 0 }),
                  ],
                }),
              ],
            }),
          ],
        }),
      }),
      1,
      1,
    );
  });

  it('persists program_invested_financial_resources on planned toc mapping update', async () => {
    const payload: any = {
      result_id: 1,
      changePrimaryInit: 50,
      result_toc_result: {
        planned_result: true,
        initiative_id: 50,
        result_toc_results: [
          {
            result_toc_result_id: 10350,
            toc_result_id: 6286,
            initiative_id: 50,
            planned_result: true,
            toc_level_id: 1,
            program_invested_financial_resources: true,
          },
        ],
      },
    };

    resultByInitiativesRepository.findOne.mockResolvedValueOnce({
      initiative_id: 50,
    } as any);

    await service.createTocMappingV2(payload, { id: 1 } as TokenDto);

    expect(resultsTocResultRepository.update).toHaveBeenCalledWith(
      10350,
      expect.objectContaining({
        program_invested_financial_resources: true,
      }),
    );
  });

  it('persists program_invested_financial_resources on unplanned toc mapping update', async () => {
    const payload: any = {
      result_id: 1,
      changePrimaryInit: 50,
      result_toc_result: {
        planned_result: false,
        initiative_id: 50,
        toc_progressive_narrative: 'Reported outside 2026 TOC indicators',
        result_toc_results: [
          {
            result_toc_result_id: 10351,
            program_invested_financial_resources: false,
          },
        ],
      },
    };

    resultByInitiativesRepository.findOne.mockResolvedValueOnce({
      initiative_id: 50,
    } as any);
    resultsTocResultRepository.find.mockResolvedValueOnce([]);

    await service.createTocMappingV2(payload, { id: 1 } as TokenDto);

    expect(resultsTocResultRepository.update).toHaveBeenCalledWith(
      10351,
      expect.objectContaining({
        planned_result: false,
        program_invested_financial_resources: false,
        toc_progressive_narrative: 'Reported outside 2026 TOC indicators',
      }),
    );
  });

  it('persists program_invested_financial_resources on unplanned special case insert', async () => {
    const payload: any = {
      result_id: 1,
      changePrimaryInit: 50,
      result_toc_result: {
        planned_result: false,
        initiative_id: 50,
        toc_progressive_narrative: 'Justification text',
        program_invested_financial_resources: true,
      },
    };

    resultByInitiativesRepository.findOne.mockResolvedValueOnce({
      initiative_id: 50,
    } as any);
    resultsTocResultRepository.find.mockResolvedValueOnce([]);

    await service.createTocMappingV2(payload, { id: 1 } as TokenDto);

    expect(resultsTocResultRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        planned_result: false,
        program_invested_financial_resources: true,
        toc_progressive_narrative: 'Justification text',
      }),
    );
  });

  it('persists program_invested_financial_resources on contributor toc mapping update', async () => {
    const payload: any = {
      result_id: 1,
      changePrimaryInit: 50,
      result_toc_result: {
        planned_result: true,
        initiative_id: 50,
        result_toc_results: [],
      },
      contributors_result_toc_result: [
        {
          initiative_id: 51,
          planned_result: true,
          result_toc_results: [
            {
              result_toc_result_id: 2010,
              toc_result_id: 9999,
              initiative_id: 51,
              program_invested_financial_resources: false,
            },
          ],
        },
      ],
    };

    resultByInitiativesRepository.findOne.mockResolvedValueOnce({
      initiative_id: 50,
    } as any);
    resultByInitiativesRepository.findBy.mockResolvedValueOnce([]);

    await service.createTocMappingV2(payload, { id: 1 } as TokenDto);

    expect(resultsTocResultRepository.update).toHaveBeenCalledWith(
      2010,
      expect.objectContaining({
        program_invested_financial_resources: false,
      }),
    );
  });

  it('persists pending science programs with from_toc on save', async () => {
    const payload: any = {
      result_id: 1,
      changePrimaryInit: 50,
      contributing_initiatives: {
        accepted_contributing_initiatives: [],
        pending_contributing_initiatives: [{ id: 61, from_toc: false }],
      },
    };

    resultByInitiativesRepository.findOne.mockResolvedValueOnce({
      initiative_id: 50,
    } as any);

    await service.createTocMappingV2(payload, { id: 1 } as TokenDto);

    expect(shareResultRequestService.resultRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        initiativeShareId: [61],
        initiativeFromToc: { 61: false },
      }),
      1,
      { id: 1 },
    );
    expect(
      shareResultRequestRepository.updateFromTocByResultAndInitiative,
    ).toHaveBeenCalledWith(1, 61, false, 1);
    expect(
      resultByInitiativesRepository.updateInitiativeFromTocFlags,
    ).toHaveBeenCalledWith(1, new Map([[61, false]]), 1);
  });

  it('auto-cancels pending share requests omitted from PATCH (P2-3115)', async () => {
    resultByInitiativesRepository.findOne.mockResolvedValueOnce({
      initiative_id: 50,
    } as any);
    resultByInitiativesRepository.getDraftInit.mockResolvedValueOnce([
      {
        id: 61,
        share_result_request_id: 9001,
        from_toc: true,
        is_active: 1,
      },
      {
        id: 62,
        share_result_request_id: 9002,
        from_toc: true,
        is_active: 1,
      },
    ] as any);

    const payload: any = {
      result_id: 1,
      changePrimaryInit: 50,
      contributing_initiatives: {
        accepted_contributing_initiatives: [],
        pending_contributing_initiatives: [{ id: 61, from_toc: true }],
      },
    };

    await service.createTocMappingV2(payload, { id: 1 } as TokenDto);

    expect(shareResultRequestRepository.cancelRequest).toHaveBeenCalledWith([
      9002,
    ]);
  });

  it('auto-cancels all pending share requests when pending array is empty', async () => {
    resultByInitiativesRepository.findOne.mockResolvedValueOnce({
      initiative_id: 50,
    } as any);
    resultByInitiativesRepository.getDraftInit.mockResolvedValueOnce([
      {
        id: 61,
        share_result_request_id: 9001,
        from_toc: true,
        is_active: 1,
      },
    ] as any);

    const payload: any = {
      result_id: 1,
      changePrimaryInit: 50,
      contributing_initiatives: {
        accepted_contributing_initiatives: [],
        pending_contributing_initiatives: [],
      },
    };

    await service.createTocMappingV2(payload, { id: 1 } as TokenDto);

    expect(shareResultRequestRepository.cancelRequest).toHaveBeenCalledWith([
      9001,
    ]);
    expect(shareResultRequestService.resultRequest).not.toHaveBeenCalled();
  });

  describe('createTocMappingV2 — MHL-R-4 typology-mismatch guard', () => {
    const KNOWLEDGE_PRODUCT_RESULT_TYPE_ID = 6;
    const OTHER_OUTCOME_RESULT_TYPE_ID = 4; // no RESULT_TYPE_TO_INDICATOR_PATTERN entry
    const SHARED_AOW_WORK_PACKAGE_ID = 700; // MHL-AC-1: both HLOs share this AoW

    it('MHL-AC-1/MHL-R-5: two typology-matching HLO items under the same AoW both persist', async () => {
      resultRepository.getResultById.mockResolvedValueOnce({
        id: 1,
        result_level_id: 3,
        initiative_id: 50,
        result_type_id: KNOWLEDGE_PRODUCT_RESULT_TYPE_ID,
      } as any);
      resultByInitiativesRepository.findOne.mockResolvedValueOnce({
        initiative_id: 50,
      } as any);
      tocResultsRepository.getTocResultTypologyVerdicts.mockResolvedValueOnce(
        new Map([
          [8001, true],
          [8002, true],
        ]),
      );

      const payload: any = {
        result_id: 1,
        changePrimaryInit: 50,
        result_toc_result: {
          planned_result: true,
          initiative_id: 50,
          result_toc_results: [
            {
              toc_result_id: 8001,
              initiative_id: 50,
              toc_level_id: 1,
              work_package_id: SHARED_AOW_WORK_PACKAGE_ID,
            },
            {
              toc_result_id: 8002,
              initiative_id: 50,
              toc_level_id: 1,
              work_package_id: SHARED_AOW_WORK_PACKAGE_ID,
            },
          ],
        },
      };

      const response = await service.createTocMappingV2(payload, {
        id: 1,
      } as TokenDto);

      expect(
        tocResultsRepository.getTocResultTypologyVerdicts,
      ).toHaveBeenCalledWith(
        expect.arrayContaining([8001, 8002]),
        KNOWLEDGE_PRODUCT_RESULT_TYPE_ID,
      );
      expect(resultsTocResultRepository.insert).toHaveBeenCalledWith(
        expect.objectContaining({ toc_result_id: 8001 }),
      );
      expect(resultsTocResultRepository.insert).toHaveBeenCalledWith(
        expect.objectContaining({ toc_result_id: 8002 }),
      );
      expect((response as any).status).toBe(201);
    });

    it('MHL-AC-3: a typology-mismatched item is rejected (422) while a matching sibling in the same request still persists', async () => {
      resultRepository.getResultById.mockResolvedValueOnce({
        id: 1,
        result_level_id: 3,
        initiative_id: 50,
        result_type_id: KNOWLEDGE_PRODUCT_RESULT_TYPE_ID,
      } as any);
      resultByInitiativesRepository.findOne.mockResolvedValueOnce({
        initiative_id: 50,
      } as any);
      // Only 8001 verdicts true for the Knowledge Product result — 9001 is
      // deliberately false, the only difference from the passing case above
      // (same AoW, same shape otherwise).
      tocResultsRepository.getTocResultTypologyVerdicts.mockResolvedValueOnce(
        new Map([
          [8001, true],
          [9001, false],
        ]),
      );

      const payload: any = {
        result_id: 1,
        changePrimaryInit: 50,
        result_toc_result: {
          planned_result: true,
          initiative_id: 50,
          result_toc_results: [
            {
              toc_result_id: 8001,
              initiative_id: 50,
              toc_level_id: 1,
              work_package_id: SHARED_AOW_WORK_PACKAGE_ID,
            },
            {
              toc_result_id: 9001,
              initiative_id: 50,
              toc_level_id: 1,
              work_package_id: SHARED_AOW_WORK_PACKAGE_ID,
            },
          ],
        },
      };

      const response = await service.createTocMappingV2(payload, {
        id: 1,
      } as TokenDto);

      expect(resultsTocResultRepository.insert).toHaveBeenCalledWith(
        expect.objectContaining({ toc_result_id: 8001 }),
      );
      expect(resultsTocResultRepository.insert).not.toHaveBeenCalledWith(
        expect.objectContaining({ toc_result_id: 9001 }),
      );
      expect(
        (response as any).response.result_toc_result
          .rejected_result_toc_results,
      ).toEqual([
        expect.objectContaining({
          toc_result_id: 9001,
          message: expect.stringContaining('9001'),
        }),
      ]);
      // MHL-AC-3 / Reviewer Issue 1: the rejection MUST be a real HTTP-level
      // validation error (422), not merely an additive response field on a
      // 201 — `ResponseInterceptor` reads this `status` to set the real
      // response code.
      expect((response as any).status).toBe(422);
      expect((response as any).message).toContain('9001');
    });

    it('Reviewer Issue 1: a rejected item carrying an existing result_toc_result_id is NOT deactivated', async () => {
      resultRepository.getResultById.mockResolvedValueOnce({
        id: 1,
        result_level_id: 3,
        initiative_id: 50,
        result_type_id: KNOWLEDGE_PRODUCT_RESULT_TYPE_ID,
      } as any);
      resultByInitiativesRepository.findOne.mockResolvedValueOnce({
        initiative_id: 50,
      } as any);
      // The pre-existing row (result_toc_result_id 10350) is already active
      // per the shared `find` mock in beforeEach. This request re-submits it
      // pointing at a now-mismatched toc_result_id (8001, verdict false) —
      // the guard must reject it WITHOUT letting the deactivation sweep
      // soft-delete the still-persisted row.
      tocResultsRepository.getTocResultTypologyVerdicts.mockResolvedValueOnce(
        new Map([[8001, false]]),
      );

      const payload: any = {
        result_id: 1,
        changePrimaryInit: 50,
        result_toc_result: {
          planned_result: true,
          initiative_id: 50,
          result_toc_results: [
            {
              result_toc_result_id: 10350,
              toc_result_id: 8001,
              initiative_id: 50,
              toc_level_id: 1,
              work_package_id: SHARED_AOW_WORK_PACKAGE_ID,
            },
          ],
        },
      };

      const response = await service.createTocMappingV2(payload, {
        id: 1,
      } as TokenDto);

      // Rejected and reported.
      expect(
        (response as any).response.result_toc_result
          .rejected_result_toc_results,
      ).toEqual([expect.objectContaining({ toc_result_id: 8001 })]);
      expect((response as any).status).toBe(422);

      // The pre-existing row (10350) must NOT be soft-deactivated by the
      // deactivation sweep, and must not be rewritten with the mismatched
      // toc_result_id either.
      expect(resultsTocResultRepository.update).not.toHaveBeenCalledWith(
        10350,
        expect.objectContaining({ is_active: false }),
      );
      expect(resultsTocResultRepository.update).not.toHaveBeenCalledWith(
        10350,
        expect.objectContaining({ toc_result_id: 8001 }),
      );
    });

    it('Reviewer Issue 1 (unplanned path): a rejected item carrying an existing result_toc_result_id is NOT deactivated', async () => {
      resultRepository.getResultById.mockResolvedValueOnce({
        id: 1,
        result_level_id: 3,
        initiative_id: 50,
        result_type_id: KNOWLEDGE_PRODUCT_RESULT_TYPE_ID,
      } as any);
      resultByInitiativesRepository.findOne.mockResolvedValueOnce({
        initiative_id: 50,
      } as any);
      // Same structure as the planned-path case above, but `planned_result`
      // is false — the unplanned branch blanket-deactivates every active row
      // for the result and then only re-activates rows still present in the
      // payload. The guard stripped this row from the payload, so nothing
      // re-activates it: the blanket sweep must skip it explicitly.
      resultsTocResultRepository.find.mockResolvedValue([
        {
          result_toc_result_id: 10350,
          result_id: 1,
          initiative_ids: 50,
          is_active: true,
        },
      ] as any);
      tocResultsRepository.getTocResultTypologyVerdicts.mockResolvedValueOnce(
        new Map([[8001, false]]),
      );

      const payload: any = {
        result_id: 1,
        changePrimaryInit: 50,
        result_toc_result: {
          planned_result: false,
          initiative_id: 50,
          toc_progressive_narrative: 'Reported outside 2026 TOC indicators',
          result_toc_results: [
            {
              result_toc_result_id: 10350,
              toc_result_id: 8001,
              initiative_id: 50,
              toc_level_id: 1,
              work_package_id: SHARED_AOW_WORK_PACKAGE_ID,
            },
          ],
        },
      };

      const response = await service.createTocMappingV2(payload, {
        id: 1,
      } as TokenDto);

      // Rejected and reported as a real validation error.
      expect(
        (response as any).response.result_toc_result
          .rejected_result_toc_results,
      ).toEqual([expect.objectContaining({ toc_result_id: 8001 })]);
      expect((response as any).status).toBe(422);

      // The pre-existing row (10350) must survive BOTH unplanned-branch
      // deactivation sites untouched: the blanket sweep (by id) and the
      // "unplanned without result_toc_results" special case (by criteria).
      expect(resultsTocResultRepository.update).not.toHaveBeenCalledWith(
        10350,
        expect.objectContaining({ is_active: false }),
      );
      expect(resultsTocResultRepository.update).not.toHaveBeenCalledWith(
        10350,
        expect.objectContaining({ toc_result_id: 8001 }),
      );

      const criteriaDeactivations = (
        resultsTocResultRepository.update as jest.Mock
      ).mock.calls.filter(
        ([criteria, payloadArg]) =>
          typeof criteria === 'object' &&
          criteria !== null &&
          payloadArg?.is_active === false,
      );
      expect(criteriaDeactivations.length).toBeGreaterThan(0);
      for (const [criteria] of criteriaDeactivations) {
        expect(criteria.result_toc_result_id).toEqual(Not(In([10350])));
      }
    });

    it('Reviewer Issue 1 (unplanned path): rows absent from the payload are still deactivated', async () => {
      resultRepository.getResultById.mockResolvedValueOnce({
        id: 1,
        result_level_id: 3,
        initiative_id: 50,
        result_type_id: KNOWLEDGE_PRODUCT_RESULT_TYPE_ID,
      } as any);
      resultByInitiativesRepository.findOne.mockResolvedValueOnce({
        initiative_id: 50,
      } as any);
      // 10350 is rejected-but-preserved; 10360 is a row the submitter really
      // dropped from the payload and MUST still be soft-deleted — the fix
      // spares only the guard's preserved ids, not every existing row.
      resultsTocResultRepository.find.mockResolvedValue([
        {
          result_toc_result_id: 10350,
          result_id: 1,
          initiative_ids: 50,
          is_active: true,
        },
        {
          result_toc_result_id: 10360,
          result_id: 1,
          initiative_ids: 50,
          is_active: true,
        },
      ] as any);
      tocResultsRepository.getTocResultTypologyVerdicts.mockResolvedValueOnce(
        new Map([[8001, false]]),
      );

      const payload: any = {
        result_id: 1,
        changePrimaryInit: 50,
        result_toc_result: {
          planned_result: false,
          initiative_id: 50,
          result_toc_results: [
            {
              result_toc_result_id: 10350,
              toc_result_id: 8001,
              initiative_id: 50,
              toc_level_id: 1,
            },
          ],
        },
      };

      await service.createTocMappingV2(payload, { id: 1 } as TokenDto);

      expect(resultsTocResultRepository.update).toHaveBeenCalledWith(
        10360,
        expect.objectContaining({ is_active: false }),
      );
      expect(resultsTocResultRepository.update).not.toHaveBeenCalledWith(
        10350,
        expect.objectContaining({ is_active: false }),
      );
    });

    it('Reviewer Issue 2: a neutral/zero-indicator node is NOT rejected', async () => {
      resultRepository.getResultById.mockResolvedValueOnce({
        id: 1,
        result_level_id: 3,
        initiative_id: 50,
        result_type_id: KNOWLEDGE_PRODUCT_RESULT_TYPE_ID,
      } as any);
      resultByInitiativesRepository.findOne.mockResolvedValueOnce({
        initiative_id: 50,
      } as any);
      // A node with zero indicators (or only inactive other-type indicators)
      // is "neutral": `getTocResultTypologyVerdicts` (which reuses
      // `_buildPlannedResultTypeIndicatorExistsFilter`'s
      // `currentTypeExists OR NOT EXISTS other-type` expression) verdicts it
      // true, matching the candidate-list semantics the submitter already saw.
      tocResultsRepository.getTocResultTypologyVerdicts.mockResolvedValueOnce(
        new Map([[8003, true]]),
      );

      const payload: any = {
        result_id: 1,
        changePrimaryInit: 50,
        result_toc_result: {
          planned_result: true,
          initiative_id: 50,
          result_toc_results: [
            {
              toc_result_id: 8003,
              initiative_id: 50,
              toc_level_id: 1,
              work_package_id: SHARED_AOW_WORK_PACKAGE_ID,
            },
          ],
        },
      };

      const response = await service.createTocMappingV2(payload, {
        id: 1,
      } as TokenDto);

      expect(resultsTocResultRepository.insert).toHaveBeenCalledWith(
        expect.objectContaining({ toc_result_id: 8003 }),
      );
      expect(
        (response as any).response.result_toc_result
          .rejected_result_toc_results,
      ).toEqual([]);
      expect((response as any).status).toBe(201);
    });

    it('MHL-OQ permissive fallback: a result type with no RESULT_TYPE_TO_INDICATOR_PATTERN entry is permitted through', async () => {
      resultRepository.getResultById.mockResolvedValueOnce({
        id: 1,
        result_level_id: 3,
        initiative_id: 50,
        result_type_id: OTHER_OUTCOME_RESULT_TYPE_ID,
      } as any);
      resultByInitiativesRepository.findOne.mockResolvedValueOnce({
        initiative_id: 50,
      } as any);

      const payload: any = {
        result_id: 1,
        changePrimaryInit: 50,
        result_toc_result: {
          planned_result: true,
          initiative_id: 50,
          result_toc_results: [
            { toc_result_id: 9002, initiative_id: 50, toc_level_id: 1 },
          ],
        },
      };

      const response = await service.createTocMappingV2(payload, {
        id: 1,
      } as TokenDto);

      // OTHER_OUTCOME has no pattern entry: the guard must be permissive and
      // skip the check entirely (no DB lookup), not reject the link.
      expect(
        tocResultsRepository.getTocResultTypologyVerdicts,
      ).not.toHaveBeenCalled();
      expect(resultsTocResultRepository.insert).toHaveBeenCalledWith(
        expect.objectContaining({ toc_result_id: 9002 }),
      );
      expect(
        (response as any).response.result_toc_result
          .rejected_result_toc_results,
      ).toEqual([]);
      expect((response as any).status).toBe(201);
    });
  });

  describe('getTocResultTypologyVerdicts (BIL-TOC-T-4)', () => {
    it('delegates to TocResultsRepository.getTocResultTypologyVerdicts', async () => {
      const mockVerdicts = new Map([
        [100, true],
        [200, false],
      ]);
      tocResultsRepository.getTocResultTypologyVerdicts.mockResolvedValueOnce(
        mockVerdicts,
      );

      const verdicts = await service.getTocResultTypologyVerdicts(
        [100, 200],
        6,
      );

      expect(
        tocResultsRepository.getTocResultTypologyVerdicts,
      ).toHaveBeenCalledWith([100, 200], 6);
      expect(verdicts).toBe(mockVerdicts);
    });
  });

  describe('updateTocResultPartial — BIL-RTE-DD-4 scoping (R-9)', () => {
    function deactivatedIds() {
      return resultsTocResultRepository.update.mock.calls
        .filter(([, changes]) => (changes as any)?.is_active === false)
        .map(([id]) => id);
    }

    it('R-9.a: SP Y row survives SP X Yes save (red before DD-4 scoping)', async () => {
      resultsTocResultRepository.find.mockResolvedValueOnce([
        {
          result_toc_result_id: 10350,
          result_id: 1,
          initiative_ids: 50,
          is_active: true,
        },
        {
          result_toc_result_id: 20450,
          result_id: 1,
          initiative_ids: 99,
          is_active: true,
        },
      ] as any);

      const payload: any = {
        planned_result: true,
        initiative_id: 50,
        result_toc_results: [
          {
            result_toc_result_id: 10350,
            toc_result_id: 6286,
            toc_level_id: 1,
          },
        ],
      };

      await service.updateTocResultPartial(1, payload, { id: 1 } as TokenDto);

      expect(deactivatedIds()).not.toContain(20450);
    });

    it('R-9.a: SP Y row survives SP X No save (red before DD-4 scoping)', async () => {
      resultsTocResultRepository.find
        .mockResolvedValueOnce([
          {
            result_toc_result_id: 10350,
            result_id: 1,
            initiative_ids: 50,
            is_active: true,
          },
          {
            result_toc_result_id: 20450,
            result_id: 1,
            initiative_ids: 99,
            is_active: true,
          },
        ] as any)
        .mockResolvedValueOnce([
          {
            result_toc_result_id: 10350,
            result_id: 1,
            initiative_ids: 50,
            is_active: true,
          },
          {
            result_toc_result_id: 20450,
            result_id: 1,
            initiative_ids: 99,
            is_active: true,
          },
        ] as any);

      const payload: any = {
        planned_result: false,
        initiative_id: 50,
        toc_progressive_narrative: 'Reported outside 2026 TOC indicators',
      };

      await service.updateTocResultPartial(1, payload, { id: 1 } as TokenDto);

      expect(deactivatedIds()).not.toContain(20450);
    });

    it('cleans a legacy null-initiative row for the owner on an owner save', async () => {
      // Explicit initSubmitter so this proves the OWNER case, not merely
      // "some program resolved" — the owner (50) is the one saving here.
      resultByInitiativesRepository.findOne.mockResolvedValueOnce({
        initiative_id: 50,
      } as any);

      resultsTocResultRepository.find.mockResolvedValueOnce([
        {
          result_toc_result_id: 30550,
          result_id: 1,
          initiative_ids: null,
          is_active: true,
        },
      ] as any);

      const payload: any = {
        planned_result: true,
        initiative_id: 50,
        result_toc_results: [
          {
            result_toc_result_id: 10350,
            toc_result_id: 6286,
          },
        ],
      };

      await service.updateTocResultPartial(1, payload, { id: 7 } as TokenDto);

      expect(resultsTocResultRepository.update).toHaveBeenCalledWith(
        30550,
        expect.objectContaining({ is_active: false, last_updated_by: 7 }),
      );
    });

    it("does NOT clean the owner's legacy null-initiative row on a contributor Yes save (red on attempt 1)", async () => {
      // Owner (initSubmitter) is 50. The payload's SP is 99 — a
      // contributor. Attempt 1 added `null` to scope whenever ANY program
      // resolved as "primary" (here, 99, since it read initiative_id off
      // the payload first) — which let a contributor's save deactivate the
      // owner's legacy null-initiative rows. That must not happen.
      resultByInitiativesRepository.findOne.mockResolvedValueOnce({
        initiative_id: 50,
      } as any);

      resultsTocResultRepository.find.mockResolvedValueOnce([
        {
          result_toc_result_id: 30551,
          result_id: 1,
          initiative_ids: null,
          is_active: true,
        },
      ] as any);

      const payload: any = {
        planned_result: true,
        initiative_id: 99,
        result_toc_results: [
          {
            result_toc_result_id: 40199,
            toc_result_id: 7000,
          },
        ],
      };

      await service.updateTocResultPartial(1, payload, { id: 3 } as TokenDto);

      expect(deactivatedIds()).not.toContain(30551);
    });

    it("does NOT clean the owner's legacy null-initiative row on a contributor No save (red on attempt 1)", async () => {
      resultByInitiativesRepository.findOne.mockResolvedValueOnce({
        initiative_id: 50,
      } as any);

      resultsTocResultRepository.find
        .mockResolvedValueOnce([
          {
            result_toc_result_id: 30551,
            result_id: 1,
            initiative_ids: null,
            is_active: true,
          },
        ] as any)
        .mockResolvedValueOnce([
          {
            result_toc_result_id: 30551,
            result_id: 1,
            initiative_ids: null,
            is_active: true,
          },
        ] as any);

      const payload: any = {
        planned_result: false,
        initiative_id: 99,
        toc_progressive_narrative: 'Contributor reports outside indicators',
      };

      await service.updateTocResultPartial(1, payload, { id: 3 } as TokenDto);

      expect(deactivatedIds()).not.toContain(30551);
    });

    it('scopes to the new (active) primary, not a stale inactive initSubmitter row', async () => {
      const OLD_PRIMARY = 40;
      const NEW_PRIMARY = 60;

      resultByInitiativesRepository.findOne.mockImplementationOnce(
        async (options: any) => {
          // Only the fixed query (filtering is_active: true) may see the
          // new, active primary. A query without that filter would pick up
          // the stale, inactive row instead.
          if (options?.where?.is_active === true) {
            return { initiative_id: NEW_PRIMARY } as any;
          }
          return { initiative_id: OLD_PRIMARY } as any;
        },
      );

      resultsTocResultRepository.find.mockResolvedValueOnce([
        {
          result_toc_result_id: 71001,
          result_id: 1,
          initiative_ids: NEW_PRIMARY,
          is_active: true,
        },
        {
          result_toc_result_id: 71002,
          result_id: 1,
          initiative_ids: OLD_PRIMARY,
          is_active: true,
        },
      ] as any);

      const payload: any = {
        planned_result: true,
        // No top-level initiative_id: forces the fallback to initSubmitter.
        result_toc_results: [],
      };

      await service.updateTocResultPartial(1, payload, { id: 9 } as TokenDto);

      expect(resultByInitiativesRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ is_active: true }),
        }),
      );
      expect(deactivatedIds()).toContain(71001);
      expect(deactivatedIds()).not.toContain(71002);
    });
  });

  describe('updateTocResultPartial — BIL-RTE-DD-5/DD-6: P25-onward No cascade (R-7.c, R-8)', () => {
    function deactivatedIds() {
      return resultsTocResultRepository.update.mock.calls
        .filter(([, changes]) => (changes as any)?.is_active === false)
        .map(([id]) => id);
    }

    const activeParentRow = {
      result_toc_result_id: 10350,
      result_id: 1,
      initiative_ids: 50,
      is_active: true,
    };

    function mockP25Onward() {
      resultRepository.getResultById.mockResolvedValueOnce({
        id: 1,
        result_level_id: 3,
        initiative_id: 50,
        version_id: 777,
      } as any);
      resultRepository.getPortfolioStartYearByVersionId.mockResolvedValueOnce(
        2025,
      );
    }

    it('P25 No ignores a payload that still carries the HLO: no active parent/child, no reinsert with a toc_result_id, nothing physically deleted', async () => {
      mockP25Onward();
      resultsTocResultRepository.find
        .mockResolvedValueOnce([activeParentRow] as any) // _deactivateMissingRecords
        .mockResolvedValueOnce([activeParentRow] as any); // _deactivateAllActiveRecords

      const payload: any = {
        planned_result: false,
        initiative_id: 50,
        // The client still sends the old HLO/indicator selection — the server must ignore it.
        result_toc_results: [
          {
            result_toc_result_id: 10350,
            toc_result_id: 6286,
            toc_level_id: 1,
            indicators: [{ toc_results_indicator_id: 'indicator-1' }],
          },
        ],
      };

      await service.updateTocResultPartial(1, payload, { id: 1 } as TokenDto);

      // Parent deactivated, never re-inserted with the payload's HLO.
      expect(deactivatedIds()).toContain(10350);
      const insertCalls = resultsTocResultRepository.insert.mock.calls;
      expect(insertCalls.length).toBeGreaterThan(0);
      for (const [payloadArg] of insertCalls) {
        expect((payloadArg as any).toc_result_id).toBeNull();
      }
      // No update call re-attaches the payload's toc_result_id (6286) either.
      expect(
        resultsTocResultRepository.update.mock.calls.some(
          ([, changes]) => (changes as any)?.toc_result_id === 6286,
        ),
      ).toBe(false);

      // Children cascade fired for the deactivated parent, scoped by DD-5.
      expect(
        resultsTocResultRepository.deactivateChildrenForParents,
      ).toHaveBeenCalledWith(
        expect.arrayContaining([10350]),
        1, // user.id
      );

      // Indicators are skipped for this branch (task instruction).
      expect(
        resultsTocResultRepository.saveIndicatorsPrimarySubmitter,
      ).not.toHaveBeenCalled();
    });

    it('P25 No scopes the deactivation to the saving initiative only: an item naming SP Y leaves Y untouched (DD-4/R-9)', async () => {
      mockP25Onward();
      const spXRow = activeParentRow; // initiative_ids: 50 (the saving/admin program)
      const spYRow = {
        result_toc_result_id: 20450,
        result_id: 1,
        initiative_ids: 99,
        is_active: true,
      };
      resultsTocResultRepository.find
        .mockResolvedValueOnce([spXRow, spYRow] as any) // _deactivateMissingRecords
        .mockResolvedValueOnce([spXRow, spYRow] as any); // _deactivateAllActiveRecords

      const payload: any = {
        planned_result: false,
        initiative_id: 50,
        // A stale/forged item names SP Y's own active row. Payload items are
        // ignored on a P25 No, so this must NOT pull SP Y into scope.
        result_toc_results: [
          {
            result_toc_result_id: 20450,
            toc_result_id: 7777,
            initiative_id: 99,
          },
        ],
      };

      await service.updateTocResultPartial(1, payload, { id: 1 } as TokenDto);

      expect(deactivatedIds()).toContain(10350);
      expect(deactivatedIds()).not.toContain(20450);
      expect(
        resultsTocResultRepository.deactivateChildrenForParents,
      ).toHaveBeenCalledWith(expect.arrayContaining([10350]), 1);
      expect(
        resultsTocResultRepository.deactivateChildrenForParents,
      ).not.toHaveBeenCalledWith(expect.arrayContaining([20450]), 1);
    });

    it('a later Yes with a different HLO does not touch child rows (nothing reactivates them)', async () => {
      mockP25Onward();
      resultsTocResultRepository.find.mockResolvedValueOnce([
        activeParentRow,
      ] as any); // _deactivateMissingRecords only (Yes path skips _deactivateAllActiveRecords)

      const payload: any = {
        planned_result: true,
        initiative_id: 50,
        result_toc_results: [
          {
            // Fresh selection: no result_toc_result_id, so a NEW parent row is inserted.
            toc_result_id: 9999,
            toc_level_id: 2,
            indicators: [{ toc_results_indicator_id: 'indicator-2' }],
          },
        ],
      };

      await service.updateTocResultPartial(1, payload, { id: 1 } as TokenDto);

      expect(
        resultsTocResultRepository.deactivateChildrenForParents,
      ).not.toHaveBeenCalled();
      // Today's indicator sync still runs for Yes saves.
      expect(
        resultsTocResultRepository.saveIndicatorsPrimarySubmitter,
      ).toHaveBeenCalled();
    });

    it("pre-P25 No keeps today's path: payload items are still processed and no cascade fires", async () => {
      // Default resultRepository mocks already resolve a null portfolio start
      // year (see beforeEach) -> not P25-onward.
      resultsTocResultRepository.find
        .mockResolvedValueOnce([activeParentRow] as any) // _deactivateMissingRecords
        .mockResolvedValueOnce([activeParentRow] as any); // _deactivateAllActiveRecords

      const payload: any = {
        planned_result: false,
        initiative_id: 50,
        result_toc_results: [
          {
            result_toc_result_id: 10350,
            toc_result_id: 6286,
            toc_level_id: 1,
          },
        ],
      };

      await service.updateTocResultPartial(1, payload, { id: 1 } as TokenDto);

      // Today's path: the payload item IS re-processed (not ignored).
      expect(resultsTocResultRepository.update).toHaveBeenCalledWith(
        10350,
        expect.objectContaining({ toc_result_id: 6286, planned_result: false }),
      );
      expect(
        resultsTocResultRepository.deactivateChildrenForParents,
      ).not.toHaveBeenCalled();
    });
  });

  describe('applyCatalogTargetsToInitiativesMap — TTD-T-4 GET merge (TTD-R-7, TTD-R-10, TTD-AC-9)', () => {
    // Builds the minimal initiativesMap shape applyCatalogTargetsToInitiativesMap reads:
    // one initiative -> one result -> one indicator carrying the given stored targets.
    function buildIndicatorMap(targets: any[], nodeId = 'toc-node-1') {
      const indicator = {
        toc_results_indicator_id: nodeId,
        targets,
      };
      const indicatorsMap = new Map([[1, indicator]]);
      const resultsMap = new Map([[1, { indicatorsMap }]]);
      const initiativesMap = new Map([[1, { resultsMap }]]);
      return { initiativesMap, indicator };
    }

    function applyMerge(
      initiativesMap: any,
      catalogByIndicator: Map<string, any[]>,
    ) {
      (service as any).applyCatalogTargetsToInitiativesMap(
        initiativesMap,
        catalogByIndicator,
      );
    }

    it('TTD-AC-9 / Falsifier A — a meta that already has a stored row is not appended a second time when the catalog returns that same meta (matched on toc_indicator_target_id)', () => {
      const storedRow = {
        indicators_targets: 555, // the real PRMS PK
        toc_indicator_target_id: 999,
        number_target: 6, // the stored, resolved canonical value (TTD-DD-3) — deliberately
        // NOT the catalog's own raw number, to prove the match is not happening by number.
        contributing_indicator: null,
        target_date: 2026,
        target_progress_narrative: null,
        indicator_question: null,
        target_value: null,
      };
      const { initiativesMap, indicator } = buildIndicatorMap([
        { ...storedRow },
      ]);
      const catalogByIndicator = new Map([
        [
          'toc-node-1',
          [
            {
              toc_indicator_target_id: 999,
              target_date: 2026,
              target_value: 50,
              number_target: '17',
            },
          ],
        ],
      ]);

      applyMerge(initiativesMap, catalogByIndicator);

      // Load-bearing assertion (Disqualifier): the ARRAY LENGTH is the behavioural proof —
      // a presence-only check on toc_indicator_target_id would pass even if the catalog
      // meta were appended as a second entry.
      expect(indicator.targets).toHaveLength(1);
      // The stored row's real PK is untouched — TTD-T-2 lookup (b) resolves on it.
      expect(indicator.targets[0].indicators_targets).toBe(555);
      expect(indicator.targets[0].toc_indicator_target_id).toBe(999);
      // The catalog's target_value backfills onto the existing row when it had none.
      expect(indicator.targets[0].target_value).toBe(50);
    });

    it('TTD-R-3/TTD-R-4 legacy-row fallback — Falsifier B: a stored row with toc_indicator_target_id NULL merges with a catalog meta of the same number, not appended, normalising the year across a "YYYY-MM-DD" catalog value and an integer stored value', () => {
      const legacyRow = {
        indicators_targets: 777, // the real PRMS PK, predates the toc_indicator_target_id column
        toc_indicator_target_id: null,
        number_target: 6,
        contributing_indicator: 3,
        target_date: 2026, // PRMS convention: bare integer year
        target_progress_narrative: null,
        indicator_question: null,
        target_value: null,
      };
      const { initiativesMap, indicator } = buildIndicatorMap([
        { ...legacyRow },
      ]);
      const catalogByIndicator = new Map([
        [
          'toc-node-1',
          [
            {
              toc_indicator_target_id: 1234,
              // ToC convention: a full date string — must normalise to the same year (2026)
              // as the legacy row's bare integer, or the fallback silently stops merging.
              target_date: '2026-06-30',
              target_value: null,
              number_target: '6', // same number as the legacy row
            },
          ],
        ],
      ]);

      applyMerge(initiativesMap, catalogByIndicator);

      // Load-bearing assertion: length stays 1 — the fallback merged, it did not append.
      expect(indicator.targets).toHaveLength(1);
      expect(indicator.targets[0].indicators_targets).toBe(777);
      // The contribution already stored survives the merge untouched.
      expect(indicator.targets[0].contributing_indicator).toBe(3);
      // Backfilled so a second catalog meta sharing this number+year in the same call
      // cannot match this same legacy row again.
      expect(indicator.targets[0].toc_indicator_target_id).toBe(1234);
    });

    it('TTD-R-7 — a catalog meta with no stored row reports indicators_targets: null and carries the ToC id in toc_indicator_target_id', () => {
      const { initiativesMap, indicator } = buildIndicatorMap([]);
      const catalogByIndicator = new Map([
        [
          'toc-node-1',
          [
            {
              toc_indicator_target_id: 4242,
              target_date: 2026,
              target_value: 12,
              number_target: '17',
            },
          ],
        ],
      ]);

      applyMerge(initiativesMap, catalogByIndicator);

      expect(indicator.targets).toHaveLength(1);
      expect(indicator.targets[0].indicators_targets).toBeNull();
      expect(indicator.targets[0].toc_indicator_target_id).toBe(4242);
      expect(indicator.targets[0].number_target).toBe(17);
      expect(indicator.targets[0].target_value).toBe(12);
    });
  });

  describe('getTocByResultV2 — TTD-T-4 §6 contract (raw-row branch): getRTRPrimaryV2 now selects rit.toc_indicator_target_id', () => {
    it('a stored row whose toc_indicator_target_id is non-null reports that value (not null) and still reports its real PK in indicators_targets', async () => {
      // Mimics one row of getRTRPrimaryV2's real result set now that its SELECT carries
      // rit.toc_indicator_target_id (repositories/results-toc-results.repository.ts:482) —
      // prtest row 2235: indicators_targets 2235 (the real PK), toc_indicator_target_id 624180.
      const rawRow = {
        result_toc_result_id: 10350,
        toc_result_id: 6286,
        planned_result: true,
        results_id: 1,
        initiative_id: 50,
        toc_progressive_narrative: null,
        toc_level_id: 1,
        program_invested_financial_resources: null,
        official_code: 'INIT-1',
        short_name: 'Initiative One',
        name: 'Initiative One',
        result_toc_result_indicator_id: 2563,
        toc_results_indicator_id: 'toc-node-1',
        indicator_contributing: null,
        indicator_status: 1,
        indicators_targets: 2235,
        toc_indicator_target_id: 624180,
        number_target: 6,
        contributing_indicator: 1,
        target_date: 2026,
        target_progress_narrative: null,
        indicator_question: null,
        indicator_result_type_id: null,
      };

      (resultByInitiativesRepository as any).getOwnerInitiativeByResult = jest
        .fn()
        .mockResolvedValue({
          id: 50,
          official_code: 'INIT-1',
          short_name: 'Initiative One',
        });
      (resultsTocResultRepository as any).getRTRPrimaryV2 = jest
        .fn()
        .mockResolvedValue([rawRow]);
      // No reporting-year row — the catalog merge is skipped (Number.isFinite(NaN) is
      // false), isolating this test to the raw-row conversion branch this task fixes.
      (resultRepository as any).findOne = jest.fn().mockResolvedValue(null);

      const result: any = await service.getTocByResultV2(1);

      const target =
        result.response.result_toc_result.result_toc_results[0].indicators[0]
          .targets[0];
      // Load-bearing per §6's contract ("Each target gains toc_indicator_target_id"):
      // the stored row reports the real value, not null.
      expect(target.toc_indicator_target_id).toBe(624180);
      // Untouched — indicators_targets still carries the real PRMS PK.
      expect(target.indicators_targets).toBe(2235);
    });
  });
});
