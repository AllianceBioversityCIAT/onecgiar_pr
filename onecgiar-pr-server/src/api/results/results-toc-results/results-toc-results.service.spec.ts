import { Test, TestingModule } from '@nestjs/testing';
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
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';

describe('ResultsTocResultsService', () => {
  let service: ResultsTocResultsService;
  let resultsTocResultRepository: jest.Mocked<ResultsTocResultRepository>;
  let resultByInitiativesRepository: jest.Mocked<ResultByInitiativesRepository>;
  let resultRepository: jest.Mocked<ResultRepository>;
  let shareResultRequestRepository: jest.Mocked<ShareResultRequestRepository>;
  let shareResultRequestService: jest.Mocked<ShareResultRequestService>;

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
      getContributorInitiativeByResult: jest.fn().mockResolvedValue([]),
      getPendingInit: jest.fn().mockResolvedValue([]),
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
          useValue: { cancelRequest: jest.fn().mockResolvedValue(undefined) },
        },
        { provide: ClarisaInitiativesRepository, useValue: {} },
        { provide: EmailNotificationManagementService, useValue: {} },
        { provide: TemplateRepository, useValue: {} },
        { provide: RoleByUserRepository, useValue: {} },
        { provide: UserNotificationSettingRepository, useValue: {} },
        { provide: GlobalParameterRepository, useValue: {} },
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
    ).toHaveBeenCalledWith(
      expect.objectContaining({ result_id: 1 }),
      1,
      1,
    );
    expect(
      resultsTocResultRepository.saveIndicatorsContributors,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ result_id: 1 }),
      1,
      1,
    );
    expect(resultRepository.getResultById).toHaveBeenCalledWith(1);
    expect(
      resultByInitiativesRepository.updateResultByInitiative,
    ).toHaveBeenCalled();
    expect(shareResultRequestRepository.cancelRequest).not.toHaveBeenCalled();
    expect(shareResultRequestService.resultRequest).not.toHaveBeenCalled();
  });
});
