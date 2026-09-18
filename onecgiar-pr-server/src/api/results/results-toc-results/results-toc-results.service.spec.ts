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
});
