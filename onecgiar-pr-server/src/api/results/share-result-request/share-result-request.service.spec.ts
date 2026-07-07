import { Test, TestingModule } from '@nestjs/testing';
import { ShareResultRequestService } from './share-result-request.service';
import { ShareResultRequestRepository } from './share-result-request.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultRepository } from '../result.repository';
import { ResultByInitiativesRepository } from '../results_by_inititiatives/resultByInitiatives.repository';
import { ResultsTocResultRepository } from '../results-toc-results/repositories/results-toc-results.repository';
import { ResultInitiativeBudgetRepository } from '../result_budget/repositories/result_initiative_budget.repository';
import { RoleByUserRepository } from '../../../auth/modules/role-by-user/RoleByUser.repository';
import { EmailNotificationManagementService } from '../../../shared/microservices/email-notification-management/email-notification-management.service';
import { ClarisaInitiativesRepository } from '../../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { TemplateRepository } from '../../platform-report/repositories/template.repository';
import { ResultsTocResultsService } from '../results-toc-results/results-toc-results.service';
import { GlobalParameterRepository } from '../../global-parameter/repositories/global-parameter.repository';
import { UserNotificationSettingRepository } from '../../user-notification-settings/user-notification-settings.repository';
import { VersioningService } from '../../versioning/versioning.service';
import { UserRepository } from '../../../auth/modules/user/repositories/user.repository';
import { SocketManagementService } from '../../../shared/microservices/socket-management/socket-management.service';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';

describe('ShareResultRequestService', () => {
  let service: ShareResultRequestService;

  const mockShareResultRequestRepository = {
    find: jest.fn(),
  };
  const mockResultsTocResultRepository = {
    getContributionReviewTocByResultAndInitiative: jest.fn(),
  };
  const mockRoleByUserRepository = {
    $_getMaxRoleByUser: jest.fn(),
    find: jest.fn(),
  };

  const user = { id: 10 } as TokenDto;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShareResultRequestService,
        { provide: HandlersError, useValue: { returnErrorRes: jest.fn() } },
        {
          provide: ShareResultRequestRepository,
          useValue: mockShareResultRequestRepository,
        },
        { provide: ResultRepository, useValue: {} },
        { provide: ResultByInitiativesRepository, useValue: {} },
        {
          provide: ResultsTocResultRepository,
          useValue: mockResultsTocResultRepository,
        },
        { provide: ResultInitiativeBudgetRepository, useValue: {} },
        {
          provide: RoleByUserRepository,
          useValue: mockRoleByUserRepository,
        },
        { provide: EmailNotificationManagementService, useValue: {} },
        { provide: ClarisaInitiativesRepository, useValue: {} },
        { provide: TemplateRepository, useValue: {} },
        { provide: ResultsTocResultsService, useValue: {} },
        { provide: GlobalParameterRepository, useValue: {} },
        { provide: UserNotificationSettingRepository, useValue: {} },
        { provide: VersioningService, useValue: {} },
        { provide: UserRepository, useValue: {} },
        { provide: SocketManagementService, useValue: {} },
      ],
    }).compile();

    service = module.get(ShareResultRequestService);
  });

  describe('getReceivedResultRequest (P2-3086)', () => {
    beforeEach(() => {
      mockRoleByUserRepository.$_getMaxRoleByUser.mockResolvedValue(3);
      mockRoleByUserRepository.find.mockResolvedValue([{ initiative_id: 100 }]);
    });

    it('should attach toc_contribution_review for is_map_to_toc requests', async () => {
      const tocReview = [
        {
          level: 'High Level Outcome',
          outcome_label: 'Outcome A',
          outcome_statement: 'Statement text',
          indicator_typology: 'Number of people',
          unit_of_measurement: 'People',
          target: 200,
          contribution_target: 45,
        },
      ];

      mockShareResultRequestRepository.find
        .mockResolvedValueOnce([
          {
            share_result_request_id: 1,
            result_id: 500,
            shared_inititiative_id: 42,
            request_status_id: 1,
            is_map_to_toc: true,
            obj_result: { source: 'Result', result_code: 'R-500' },
            obj_shared_inititiative: { id: 42, official_code: 'SP02' },
          },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockResultsTocResultRepository.getContributionReviewTocByResultAndInitiative.mockResolvedValue(
        tocReview,
      );

      const response: any = await service.getReceivedResultRequest(user);

      expect(
        mockResultsTocResultRepository.getContributionReviewTocByResultAndInitiative,
      ).toHaveBeenCalledWith(500, 42);
      expect(
        response.response.receivedContributionsPending[0]
          .toc_contribution_review,
      ).toEqual(tocReview);
    });

    it('should not attach toc_contribution_review for non-toc requests', async () => {
      mockShareResultRequestRepository.find
        .mockResolvedValueOnce([
          {
            share_result_request_id: 2,
            result_id: 501,
            shared_inititiative_id: 43,
            request_status_id: 1,
            is_map_to_toc: false,
            obj_result: { source: 'Result', result_code: 'R-501' },
          },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const response: any = await service.getReceivedResultRequest(user);

      expect(
        mockResultsTocResultRepository.getContributionReviewTocByResultAndInitiative,
      ).not.toHaveBeenCalled();
      expect(
        response.response.receivedContributionsPending[0]
          .toc_contribution_review,
      ).toBeUndefined();
    });

    it('should cache toc review lookups for duplicate result/initiative pairs', async () => {
      mockShareResultRequestRepository.find
        .mockResolvedValueOnce([
          {
            share_result_request_id: 3,
            result_id: 600,
            shared_inititiative_id: 55,
            request_status_id: 1,
            is_map_to_toc: true,
            obj_result: { source: 'Result' },
          },
          {
            share_result_request_id: 4,
            result_id: 600,
            shared_inititiative_id: 55,
            request_status_id: 1,
            is_map_to_toc: true,
            obj_result: { source: 'Result' },
          },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockResultsTocResultRepository.getContributionReviewTocByResultAndInitiative.mockResolvedValue(
        [],
      );

      await service.getReceivedResultRequest(user);

      expect(
        mockResultsTocResultRepository.getContributionReviewTocByResultAndInitiative,
      ).toHaveBeenCalledTimes(1);
    });
  });
});
