import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultRepository } from '../../results/result.repository';
import { ResultInnovationPackageRepository } from '../../ipsr/result-innovation-package/repositories/result-innovation-package.repository';
import { EvidencesRepository } from '../../results/evidences/evidences.repository';
import { NonPooledProjectRepository } from '../../results/non-pooled-projects/non-pooled-projects.repository';
import { ResultByInitiativesRepository } from '../../results/results_by_inititiatives/resultByInitiatives.repository';
import { ResultsByProjectsRepository } from '../../results/results_by_projects/results_by_projects.repository';
import { ResultInitiativeBudgetRepository } from '../../results/result_budget/repositories/result_initiative_budget.repository';
import { NonPooledProjectBudgetRepository } from '../../results/result_budget/repositories/non_pooled_proyect_budget.repository';
import { ResultByIntitutionsRepository } from '../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultInstitutionsBudgetRepository } from '../../results/result_budget/repositories/result_institutions_budget.repository';
import { VersioningService } from '../../versioning/versioning.service';
import { ResultsByProjectsService } from '../../results/results_by_projects/results_by_projects.service';
import { ResultScalingStudyUrl } from '../../results-framework-reporting/result_scaling_study_urls/entities/result_scaling_study_url.entity';
import { IpsrPathwayStepFourService } from './ipsr-pathway-step-four.service';
import { InstitutionRoleEnum } from '../../results/results_by_institutions/entities/institution_role.enum';

describe('IpsrPathwayStepFourService', () => {
  let service: IpsrPathwayStepFourService;

  const mockResultByInstitutionsRepository = {
    findOne: jest.fn(),
  };

  const mockResultInstitutionsBudgetRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockHandlersError = {
    returnErrorRes: jest.fn((config) => ({
      response: config.error?.response ?? { error: true },
      message: config.error?.message ?? 'INTERNAL_SERVER_ERROR',
      status: config.error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
    })),
  };

  const createRepositoryMock = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IpsrPathwayStepFourService,
        { provide: HandlersError, useValue: mockHandlersError },
        { provide: ResultRepository, useValue: createRepositoryMock() },
        {
          provide: ResultInnovationPackageRepository,
          useValue: createRepositoryMock(),
        },
        {
          provide: getRepositoryToken(ResultScalingStudyUrl),
          useValue: createRepositoryMock(),
        },
        { provide: EvidencesRepository, useValue: createRepositoryMock() },
        {
          provide: NonPooledProjectRepository,
          useValue: createRepositoryMock(),
        },
        {
          provide: ResultByInitiativesRepository,
          useValue: createRepositoryMock(),
        },
        {
          provide: ResultsByProjectsRepository,
          useValue: createRepositoryMock(),
        },
        {
          provide: ResultInitiativeBudgetRepository,
          useValue: createRepositoryMock(),
        },
        {
          provide: NonPooledProjectBudgetRepository,
          useValue: createRepositoryMock(),
        },
        {
          provide: ResultByIntitutionsRepository,
          useValue: mockResultByInstitutionsRepository,
        },
        {
          provide: ResultInstitutionsBudgetRepository,
          useValue: mockResultInstitutionsBudgetRepository,
        },
        {
          provide: VersioningService,
          useValue: { $_findActivePhase: jest.fn() },
        },
        {
          provide: ResultsByProjectsService,
          useValue: { linkBilateralProjectToResult: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(IpsrPathwayStepFourService);
  });

  describe('savePartnerInvestment', () => {
    const resultId = 32177;
    const userId = 575;
    const role2InstitutionId = 83888;
    const institutionsId = 3577;

    const partnerPayload = {
      result_institution_id: role2InstitutionId,
      kind_cash: null,
      is_determined: true,
      is_active: true,
      obj_result_institution: {
        id: role2InstitutionId,
        institutions_id: institutionsId,
        institution_roles_id: InstitutionRoleEnum.PARTNER,
      },
    };

    it('should resolve institution by result_institution_id when same institution has roles 2 and 5', async () => {
      const role2Institution = {
        id: role2InstitutionId,
        result_id: resultId,
        institutions_id: institutionsId,
        institution_roles_id: InstitutionRoleEnum.PARTNER,
      };
      const existingBudget = {
        result_institutions_budget_id: 24847,
        result_institution_id: role2InstitutionId,
        kind_cash: null,
        is_determined: null,
        is_active: true,
      };

      mockResultByInstitutionsRepository.findOne.mockResolvedValue(
        role2Institution,
      );
      mockResultInstitutionsBudgetRepository.findOne.mockResolvedValue(
        existingBudget,
      );
      mockResultInstitutionsBudgetRepository.save.mockImplementation((budget) =>
        Promise.resolve(budget),
      );

      await service.savePartnerInvestment(resultId, userId, {
        institutions_expected_investment: [partnerPayload],
      } as any);

      expect(mockResultByInstitutionsRepository.findOne).toHaveBeenCalledWith({
        where: { id: role2InstitutionId, result_id: resultId },
      });
      expect(
        mockResultInstitutionsBudgetRepository.findOne,
      ).toHaveBeenCalledWith({
        where: {
          result_institution_id: role2InstitutionId,
          is_active: true,
        },
      });
      expect(mockResultInstitutionsBudgetRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          result_institution_id: role2InstitutionId,
          is_determined: true,
          last_updated_by: userId,
        }),
      );
    });

    it('should persist is_determined true on the role 2 budget row', async () => {
      mockResultByInstitutionsRepository.findOne.mockResolvedValue({
        id: role2InstitutionId,
        institution_roles_id: InstitutionRoleEnum.PARTNER,
      });
      mockResultInstitutionsBudgetRepository.findOne.mockResolvedValue({
        result_institutions_budget_id: 24847,
        result_institution_id: role2InstitutionId,
        kind_cash: null,
        is_determined: null,
        is_active: true,
      });
      mockResultInstitutionsBudgetRepository.save.mockImplementation((budget) =>
        Promise.resolve(budget),
      );

      await service.savePartnerInvestment(resultId, userId, {
        institutions_expected_investment: [partnerPayload],
      } as any);

      const savedBudget =
        mockResultInstitutionsBudgetRepository.save.mock.calls[0][0];
      expect(savedBudget.is_determined).toBe(true);
      expect(savedBudget.result_institution_id).toBe(role2InstitutionId);
    });

    it('should return valid true when institutions_expected_investment is empty', async () => {
      const result = await service.savePartnerInvestment(resultId, userId, {
        institutions_expected_investment: [],
      } as any);

      expect(result).toEqual({ valid: true });
      expect(mockResultByInstitutionsRepository.findOne).not.toHaveBeenCalled();
      expect(
        mockResultInstitutionsBudgetRepository.save,
      ).not.toHaveBeenCalled();
    });

    it('should return NOT_FOUND when institution relation is missing', async () => {
      mockResultByInstitutionsRepository.findOne.mockResolvedValue(null);

      const result = (await service.savePartnerInvestment(resultId, userId, {
        institutions_expected_investment: [partnerPayload],
      } as any)) as { status: HttpStatus };

      expect(mockHandlersError.returnErrorRes).toHaveBeenCalled();
      expect(result.status).toBe(HttpStatus.NOT_FOUND);
    });

    it('should fallback to institutions_id with partner roles when result_institution_id is missing', async () => {
      const payloadWithoutId = {
        kind_cash: null,
        is_determined: true,
        is_active: true,
        obj_result_institution: {
          institutions_id: institutionsId,
        },
      };

      mockResultByInstitutionsRepository.findOne.mockResolvedValue({
        id: role2InstitutionId,
        institution_roles_id: InstitutionRoleEnum.PARTNER,
      });
      mockResultInstitutionsBudgetRepository.findOne.mockResolvedValue(null);
      mockResultInstitutionsBudgetRepository.create.mockReturnValue({
        result_institution_id: role2InstitutionId,
      });
      mockResultInstitutionsBudgetRepository.save.mockResolvedValue({
        result_institution_id: role2InstitutionId,
        is_determined: true,
      });

      await service.savePartnerInvestment(resultId, userId, {
        institutions_expected_investment: [payloadWithoutId],
      } as any);

      expect(mockResultByInstitutionsRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            result_id: resultId,
            institutions_id: institutionsId,
            institution_roles_id: expect.anything(),
          }),
        }),
      );
    });
  });
});
