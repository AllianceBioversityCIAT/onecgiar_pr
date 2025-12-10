import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { SummaryService } from './summary.service';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsCapacityDevelopmentsRepository } from './repositories/results-capacity-developments.repository';
import { ResultByIntitutionsRepository } from '../results_by_institutions/result_by_intitutions.repository';
import { ResultsInnovationsDevRepository } from './repositories/results-innovations-dev.repository';
import { ResultsPolicyChangesRepository } from './repositories/results-policy-changes.repository';
import { ResultRepository } from '../result.repository';
import { VersionsService } from '../versions/versions.service';
import { EvidencesRepository } from '../evidences/evidences.repository';
import { ResultActorRepository } from '../result-actors/repositories/result-actors.repository';
import { ResultByIntitutionsTypeRepository } from '../results_by_institution_types/result_by_intitutions_type.repository';
import { ResultIpMeasureRepository } from '../../ipsr/result-ip-measures/result-ip-measures.repository';
import { ResultInitiativeBudgetRepository } from '../result_budget/repositories/result_initiative_budget.repository';
import { ResultByInitiativesRepository } from '../results_by_inititiatives/resultByInitiatives.repository';
import { NonPooledProjectBudgetRepository } from '../result_budget/repositories/non_pooled_proyect_budget.repository';
import { NonPooledProjectRepository } from '../non-pooled-projects/non-pooled-projects.repository';
import { ResultInstitutionsBudgetRepository } from '../result_budget/repositories/result_institutions_budget.repository';
import { InnoDevService } from './innovation_dev.service';
import { ResultAnswerRepository } from '../result-questions/repository/result-answers.repository';

describe('SummaryService', () => {
  let service: SummaryService;

  let mockResultsCapacityDevelopmentsRepository: any;
  let mockResultByIntitutionsRepository: any;
  let mockResultsInnovationsDevRepository: any;
  let mockResultsPolicyChangesRepository: any;
  let mockResultRepository: any;
  let mockVersionsService: any;
  let mockEvidencesRepository: any;
  let mockResultActorRepository: any;
  let mockResultByIntitutionsTypeRepository: any;
  let mockResultIpMeasureRepository: any;
  let mockResultInitiativesBudgetRepository: any;
  let mockResultByInitiativeRepository: any;
  let mockResultBilateralBudgetRepository: any;
  let mockNonPooledProjectRepository: any;
  let mockResultInstitutionsBudgetRepository: any;
  let mockInnoDevService: any;
  let mockResultAnswerRepository: any;

  const user = { id: 10 } as any;

  beforeEach(async () => {
    mockResultsCapacityDevelopmentsRepository = {
      capDevExists: jest.fn(),
      save: jest.fn(),
    };
    mockResultByIntitutionsRepository = {
      updateGenericIstitutions: jest.fn(),
      getGenericResultByInstitutionExists: jest.fn(),
      save: jest.fn(),
      getGenericAllResultByInstitutionByRole: jest.fn(),
      find: jest.fn(),
    };
    mockResultsInnovationsDevRepository = {
      InnovationDevExists: jest.fn(),
      save: jest.fn(),
    };
    mockResultsPolicyChangesRepository = {
      ResultsPolicyChangesExists: jest.fn(),
      save: jest.fn(),
    };
    mockResultRepository = {
      findOne: jest.fn(),
      getResultById: jest.fn(),
    };
    mockVersionsService = {};
    mockEvidencesRepository = {
      find: jest.fn(),
    };
    mockResultActorRepository = {
      find: jest.fn(),
    };
    mockResultByIntitutionsTypeRepository = {
      find: jest.fn(),
    };
    mockResultIpMeasureRepository = {
      find: jest.fn(),
    };
    mockResultInitiativesBudgetRepository = {
      find: jest.fn(),
    };
    mockResultByInitiativeRepository = {
      find: jest.fn(),
    };
    mockResultBilateralBudgetRepository = {
      find: jest.fn(),
    };
    mockNonPooledProjectRepository = {
      find: jest.fn(),
    };
    mockResultInstitutionsBudgetRepository = {
      find: jest.fn(),
    };
    mockInnoDevService = {
      saveAnticipatedInnoUser: jest.fn(),
      saveOptionsAndSubOptions: jest.fn(),
      saveEvidence: jest.fn(),
      saveInitiativeInvestment: jest.fn(),
      saveBillateralInvestment: jest.fn(),
      savePartnerInvestment: jest.fn(),
    };
    mockResultAnswerRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SummaryService,
        HandlersError,
        {
          provide: ResultsCapacityDevelopmentsRepository,
          useValue: mockResultsCapacityDevelopmentsRepository,
        },
        {
          provide: ResultByIntitutionsRepository,
          useValue: mockResultByIntitutionsRepository,
        },
        {
          provide: ResultsInnovationsDevRepository,
          useValue: mockResultsInnovationsDevRepository,
        },
        {
          provide: ResultsPolicyChangesRepository,
          useValue: mockResultsPolicyChangesRepository,
        },
        {
          provide: ResultRepository,
          useValue: mockResultRepository,
        },
        { provide: VersionsService, useValue: mockVersionsService },
        { provide: EvidencesRepository, useValue: mockEvidencesRepository },
        { provide: ResultActorRepository, useValue: mockResultActorRepository },
        {
          provide: ResultByIntitutionsTypeRepository,
          useValue: mockResultByIntitutionsTypeRepository,
        },
        {
          provide: ResultIpMeasureRepository,
          useValue: mockResultIpMeasureRepository,
        },
        {
          provide: ResultInitiativeBudgetRepository,
          useValue: mockResultInitiativesBudgetRepository,
        },
        {
          provide: ResultByInitiativesRepository,
          useValue: mockResultByInitiativeRepository,
        },
        {
          provide: NonPooledProjectBudgetRepository,
          useValue: mockResultBilateralBudgetRepository,
        },
        {
          provide: NonPooledProjectRepository,
          useValue: mockNonPooledProjectRepository,
        },
        {
          provide: ResultInstitutionsBudgetRepository,
          useValue: mockResultInstitutionsBudgetRepository,
        },
        { provide: InnoDevService, useValue: mockInnoDevService },
        {
          provide: ResultAnswerRepository,
          useValue: mockResultAnswerRepository,
        },
      ],
    }).compile();

    service = module.get(SummaryService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('saveInnovationUse', () => {
    it('creates innovation use and returns created response', async () => {
      const dto = { field: 'value' } as any;
      mockResultRepository.findOne.mockResolvedValueOnce({ id: 5 });
      mockInnoDevService.saveAnticipatedInnoUser.mockResolvedValueOnce({
        id: 9,
      });

      const res = await service.saveInnovationUse(dto, 5, user);

      expect(mockResultRepository.findOne).toHaveBeenCalledWith({
        where: { id: 5 },
      });
      expect(mockInnoDevService.saveAnticipatedInnoUser).toHaveBeenCalledWith(
        5,
        user.id,
        dto,
      );
      expect(res.status).toBe(HttpStatus.CREATED);
      expect(res.response).toEqual({ id: 9 });
    });
  });

  describe('getInnovationUse', () => {
    it('returns actors with calculated totals and organizations parent id', async () => {
      mockResultActorRepository.find.mockResolvedValueOnce([
        { men: 10, men_youth: 3, women: 8, women_youth: 2 },
      ]);
      mockResultIpMeasureRepository.find.mockResolvedValueOnce([{ id: 1 }]);
      mockResultByIntitutionsTypeRepository.find.mockResolvedValueOnce([
        {
          obj_institution_types: {
            obj_parent: { obj_parent: { code: 99 }, code: 77 },
          },
        },
      ]);

      const res = await service.getInnovationUse(15);
      const response: any = res.response as any;

      expect(mockResultActorRepository.find).toHaveBeenCalled();
      expect(res.status).toBe(HttpStatus.OK);
      expect(response.actors[0]).toMatchObject({
        men_non_youth: 7,
        women_non_youth: 6,
      });
      expect(response.organization[0].parent_institution_type_id).toBe(99);
    });
  });

  describe('saveCapacityDevelopents', () => {
    it('creates capacity development entry and institutions when not existing', async () => {
      const dto = {
        female_using: 1,
        male_using: 2,
        has_unkown_using: 0,
        non_binary_using: 0,
        capdev_delivery_method_id: 4,
        capdev_term_id: 3,
        institutions: [{ institutions_id: 55 }],
        is_attending_for_organization: true,
      } as any;

      mockResultsCapacityDevelopmentsRepository.capDevExists.mockResolvedValueOnce(
        null,
      );
      mockResultsCapacityDevelopmentsRepository.save.mockImplementation(
        async (payload) => ({ id: 100, ...payload }),
      );
      mockResultByIntitutionsRepository.getGenericResultByInstitutionExists.mockResolvedValueOnce(
        null,
      );
      mockResultByIntitutionsRepository.save.mockResolvedValueOnce([]);

      const res = await service.saveCapacityDevelopents(dto, 77, user);

      expect(mockResultsCapacityDevelopmentsRepository.save).toHaveBeenCalled();
      expect(
        mockResultByIntitutionsRepository.updateGenericIstitutions,
      ).toHaveBeenCalledWith(77, dto.institutions, 3, user.id);
      expect(mockResultByIntitutionsRepository.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            institution_roles_id: 3,
            institutions_id: 55,
            result_id: 77,
            created_by: user.id,
            last_updated_by: user.id,
          }),
        ]),
      );
      expect(res.status).toBe(HttpStatus.CREATED);
    });
  });

  describe('getCapacityDevelopents', () => {
    it('returns default response when no capacity development found', async () => {
      mockResultsCapacityDevelopmentsRepository.capDevExists.mockResolvedValueOnce(
        undefined,
      );
      mockResultByIntitutionsRepository.getGenericAllResultByInstitutionByRole.mockResolvedValueOnce(
        [],
      );

      const res = await service.getCapacityDevelopents(30);
      const response: any = res.response as any;

      expect(res.status).toBe(HttpStatus.OK);
      expect(response.result_id).toBe(30);
      expect(response.male_using).toBeNull();
      expect(response.institutions).toEqual([]);
    });
  });

  describe('savePolicyChanges', () => {
    it('creates policy change, institutions and answers', async () => {
      const dto = {
        amount: 200,
        institutions: [{ institutions_id: 2 }],
        policy_stage_id: 1,
        policy_type_id: 4,
        status_amount: 'DECLARED',
        optionsWithAnswers: [
          { result_question_id: 9, answer_boolean: true, answer_text: 'yes' },
        ],
        result_related_engagement: 'engagement',
      } as any;

      mockResultsPolicyChangesRepository.ResultsPolicyChangesExists.mockResolvedValueOnce(
        null,
      );
      mockResultsPolicyChangesRepository.save.mockResolvedValueOnce({ id: 5 });
      mockResultByIntitutionsRepository.getGenericResultByInstitutionExists.mockResolvedValueOnce(
        null,
      );
      mockResultByIntitutionsRepository.save.mockResolvedValueOnce([]);
      mockResultAnswerRepository.findOne.mockResolvedValueOnce(null);
      mockResultAnswerRepository.save.mockResolvedValueOnce({});

      const res = await service.savePolicyChanges(dto, 12, user);

      expect(
        mockResultsPolicyChangesRepository.ResultsPolicyChangesExists,
      ).toHaveBeenCalledWith(12);
      expect(
        mockResultByIntitutionsRepository.updateGenericIstitutions,
      ).toHaveBeenCalledWith(12, dto.institutions, 4, user.id);
      expect(mockResultAnswerRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          result_question_id: 9,
          result_id: 12,
        }),
      );
      expect(res.status).toBe(HttpStatus.CREATED);
      expect(res.response).toEqual({ id: 5 });
    });
  });

  describe('getPolicyChanges', () => {
    it('returns policy change with institutions when it exists', async () => {
      const policyChange = { id: 20, amount: 10 };
      const institutions = [{ id: 1 }];

      mockResultsPolicyChangesRepository.ResultsPolicyChangesExists.mockResolvedValueOnce(
        policyChange,
      );
      mockResultByIntitutionsRepository.getGenericAllResultByInstitutionByRole.mockResolvedValueOnce(
        institutions,
      );

      const res = await service.getPolicyChanges(50);
      const response: any = res.response as any;

      expect(res.status).toBe(HttpStatus.OK);
      expect(response.id).toBe(20);
      expect(response.institutions).toEqual(institutions);
    });
  });
});
