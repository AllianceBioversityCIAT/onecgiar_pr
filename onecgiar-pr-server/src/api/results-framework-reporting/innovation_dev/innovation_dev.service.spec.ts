import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { InnovationDevService } from './innovation_dev.service';
import { ResultsInnovationsDevRepository } from '../../results/summary/repositories/results-innovations-dev.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { InnovationDevelopmentDto } from '../../results/dto/review-update.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ResultByIntitutionsRepository } from '../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultRepository } from '../../results/result.repository';
import { EvidencesRepository } from '../../results/evidences/evidences.repository';
import { ResultActorRepository } from '../../results/result-actors/repositories/result-actors.repository';
import { ResultByIntitutionsTypeRepository } from '../../results/results_by_institution_types/result_by_intitutions_type.repository';
import { ResultIpMeasureRepository } from '../../ipsr/result-ip-measures/result-ip-measures.repository';
import { ResultInitiativeBudgetRepository } from '../../results/result_budget/repositories/result_initiative_budget.repository';
import { ResultByInitiativesRepository } from '../../results/results_by_inititiatives/resultByInitiatives.repository';
import { NonPooledProjectBudgetRepository } from '../../results/result_budget/repositories/non_pooled_proyect_budget.repository';
import { ResultInstitutionsBudgetRepository } from '../../results/result_budget/repositories/result_institutions_budget.repository';
import { InnoDevService } from '../../results/summary/innovation_dev.service';
import { InnovationUseService } from '../innovation-use/innovation-use.service';
import { ResultScalingStudyUrl } from '../result_scaling_study_urls/entities/result_scaling_study_url.entity';
import { ResultAnswerRepository } from '../../results/result-questions/repository/result-answers.repository';
import { ResultsByProjectsRepository } from '../../results/results_by_projects/results_by_projects.repository';
import { ResultsCenterRepository } from '../../results/results-centers/results-centers.repository';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('InnovationDevService', () => {
  let service: InnovationDevService;
  let mockResultsInnovationsDevRepository: jest.Mocked<ResultsInnovationsDevRepository>;
  let mockHandlersError: jest.Mocked<HandlersError>;
  let mockInnoDevService: {
    saveEvidence: jest.Mock;
    saveInitiativeInvestment: jest.Mock;
    savePartnerInvestment: jest.Mock;
  };
  let mockInnovationUseService: { saveAnticipatedInnoUser: jest.Mock };
  let mockResultRepository: { update: jest.Mock };
  let mockResultAnswerRepository: { find: jest.Mock; save: jest.Mock };
  let mockResultsByProjectsRepository: { find: jest.Mock };

  const userTest: TokenDto = {
    id: 1,
    first_name: 'Test',
    last_name: 'User',
    email: 'test@example.com',
  };

  const mockInnovationDev = {
    result_innovation_dev_id: 1882,
    results_id: 100,
    innovation_nature_id: 13,
    innovation_readiness_level_id: 11,
    innovation_developers: 'Original Developer',
    readiness_level: '0',
    short_title: 'Test Innovation',
    is_active: true,
    last_updated_by: 1,
  };

  // Helper function to create fresh mock copies
  const createMockCopy = () => JSON.parse(JSON.stringify(mockInnovationDev));

  const setupPersistMocks = (
    mockCopy: typeof mockInnovationDev,
    updatedMock: typeof mockInnovationDev,
  ) => {
    (
      mockResultsInnovationsDevRepository.InnovationDevExists as jest.Mock
    ).mockResolvedValueOnce(mockCopy);
    (
      mockResultsInnovationsDevRepository.findOne as jest.Mock
    ).mockResolvedValueOnce({ ...mockCopy });
    (
      mockResultsInnovationsDevRepository.save as jest.Mock
    ).mockResolvedValueOnce(updatedMock);
  };

  const buildInnovationDevQuestions = () => ({
    responsible_innovation_and_scaling: {
      q1: { radioButtonValue: null, options: [] },
      q2: { radioButtonValue: null, options: [] },
      q3: { radioButtonValue: null, options: [] },
      q4: { radioButtonValue: null, options: [] },
    },
    intellectual_property_rights: {
      q1: { radioButtonValue: null, options: [] },
      q2: { radioButtonValue: null, options: [] },
      q3: { radioButtonValue: null, options: [] },
      q4: { radioButtonValue: null, options: [] },
    },
    innovation_team_diversity: { radioButtonValue: null, options: [] },
    megatrends: { radioButtonValue: null, options: [] },
  });

  beforeEach(async () => {
    const mockResultsInnovationsDevRepo = {
      InnovationDevExists: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    };

    const mockHandlersErrorService = {
      returnErrorRes: jest.fn(({ error }) => ({
        response: {},
        message: error?.message || 'Error occurred',
        status: error?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      })),
    };
    mockInnoDevService = {
      saveEvidence: jest.fn().mockResolvedValue(undefined),
      saveInitiativeInvestment: jest.fn().mockResolvedValue(undefined),
      savePartnerInvestment: jest.fn().mockResolvedValue(undefined),
    };
    mockInnovationUseService = {
      saveAnticipatedInnoUser: jest.fn().mockResolvedValue(undefined),
    };
    mockResultRepository = {
      update: jest.fn().mockResolvedValue(undefined),
    };
    mockResultAnswerRepository = {
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockResultsByProjectsRepository = {
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InnovationDevService,
        {
          provide: ResultsInnovationsDevRepository,
          useValue: mockResultsInnovationsDevRepo,
        },
        {
          provide: HandlersError,
          useValue: mockHandlersErrorService,
        },
        {
          provide: ResultByIntitutionsRepository,
          useValue: {},
        },
        {
          provide: ResultRepository,
          useValue: mockResultRepository,
        },
        {
          provide: EvidencesRepository,
          useValue: {},
        },
        {
          provide: ResultActorRepository,
          useValue: {},
        },
        {
          provide: ResultByIntitutionsTypeRepository,
          useValue: {},
        },
        {
          provide: ResultIpMeasureRepository,
          useValue: {},
        },
        {
          provide: ResultInitiativeBudgetRepository,
          useValue: {},
        },
        {
          provide: ResultByInitiativesRepository,
          useValue: {},
        },
        {
          provide: NonPooledProjectBudgetRepository,
          useValue: {},
        },
        {
          provide: ResultInstitutionsBudgetRepository,
          useValue: {},
        },
        {
          provide: InnoDevService,
          useValue: mockInnoDevService,
        },
        {
          provide: InnovationUseService,
          useValue: mockInnovationUseService,
        },
        {
          provide: getRepositoryToken(ResultScalingStudyUrl),
          useValue: {},
        },
        {
          provide: ResultAnswerRepository,
          useValue: mockResultAnswerRepository,
        },
        {
          provide: ResultsByProjectsRepository,
          useValue: mockResultsByProjectsRepository,
        },
        {
          provide: ResultsCenterRepository,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<InnovationDevService>(InnovationDevService);
    mockResultsInnovationsDevRepository = module.get(
      ResultsInnovationsDevRepository,
    );
    mockHandlersError = module.get(HandlersError);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateInnovationDevPartial', () => {
    it('should update innovation development successfully with all fields', async () => {
      const resultId = 100;
      const innovationDevDto: InnovationDevelopmentDto = {
        result_innovation_dev_id: 1882,
        innovation_nature_id: 15,
        innovation_type_id: 13,
        innovation_type_name: 'Capacity development innovation',
        innovation_developers: 'Ms. Yodalieva Markhabo',
        innovation_readiness_level_id: 12,
        level: '1',
        name: 'Prototype',
        budget_id: 1,
        kind_cash: 1000000,
        is_determined: true,
        project_id: 1,
      };

      const mockCopy = createMockCopy();

      const updatedMock = {
        ...mockCopy,
        innovation_nature_id: 15,
        innovation_developers: 'Ms. Yodalieva Markhabo',
        innovation_readiness_level_id: 12,
        readiness_level: '1',
        last_updated_by: userTest.id,
      };

      setupPersistMocks(mockCopy, updatedMock);

      const result = await service.updateInnovationDevPartial(
        resultId,
        innovationDevDto,
        userTest,
      );

      expect(result.status).toBe(HttpStatus.OK);
      expect(result.message).toBe(
        'Innovation development updated successfully',
      );
      expect(result.response).toEqual(updatedMock);
      expect(
        mockResultsInnovationsDevRepository.InnovationDevExists,
      ).toHaveBeenCalledWith(resultId);
      expect(mockResultsInnovationsDevRepository.findOne).toHaveBeenCalledWith({
        where: {
          result_innovation_dev_id: mockCopy.result_innovation_dev_id,
          is_active: true,
        },
      });
      expect(mockResultsInnovationsDevRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          innovation_developers: 'Ms. Yodalieva Markhabo',
          readiness_level: '1',
          last_updated_by: userTest.id,
          innovation_nature: { code: 15 },
          innovation_readiness_level: { id: 12 },
        }),
      );
    });

    it('should update innovation development with partial fields (only innovation_nature_id)', async () => {
      const resultId = 100;
      const innovationDevDto: Partial<InnovationDevelopmentDto> = {
        result_innovation_dev_id: 1882,
        innovation_nature_id: 20,
        innovation_type_id: 13,
        innovation_type_name: 'Capacity development innovation',
        name: 'Idea',
      };

      const mockCopy = createMockCopy();

      const updatedMock = {
        ...mockCopy,
        innovation_nature_id: 20,
        last_updated_by: userTest.id,
      };

      setupPersistMocks(mockCopy, updatedMock);

      const result = await service.updateInnovationDevPartial(
        resultId,
        innovationDevDto as InnovationDevelopmentDto,
        userTest,
      );

      expect(result.status).toBe(HttpStatus.OK);
      expect(mockResultsInnovationsDevRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          last_updated_by: userTest.id,
          innovation_nature: { code: 20 },
        }),
      );
    });

    it('should update innovation development with only innovation_developers', async () => {
      const resultId = 100;
      const innovationDevDto: Partial<InnovationDevelopmentDto> = {
        result_innovation_dev_id: 1882,
        innovation_developers: 'New Developer Name',
      };

      const mockCopy = createMockCopy();

      const updatedMock = {
        ...mockCopy,
        innovation_developers: 'New Developer Name',
        last_updated_by: userTest.id,
      };

      setupPersistMocks(mockCopy, updatedMock);

      const result = await service.updateInnovationDevPartial(
        resultId,
        innovationDevDto as InnovationDevelopmentDto,
        userTest,
      );

      expect(result.status).toBe(HttpStatus.OK);
      expect(mockResultsInnovationsDevRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          innovation_developers: 'New Developer Name',
          last_updated_by: userTest.id,
        }),
      );
    });

    it('should update innovation development with only innovation_readiness_level_id and level', async () => {
      const resultId = 100;
      const innovationDevDto: Partial<InnovationDevelopmentDto> = {
        result_innovation_dev_id: 1882,
        innovation_readiness_level_id: 15,
        level: '2',
      };

      const mockCopy = createMockCopy();

      const updatedMock = {
        ...mockCopy,
        innovation_readiness_level_id: 15,
        readiness_level: '2',
        last_updated_by: userTest.id,
      };

      setupPersistMocks(mockCopy, updatedMock);

      const result = await service.updateInnovationDevPartial(
        resultId,
        innovationDevDto as InnovationDevelopmentDto,
        userTest,
      );

      expect(result.status).toBe(HttpStatus.OK);
      expect(mockResultsInnovationsDevRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          readiness_level: '2',
          last_updated_by: userTest.id,
          innovation_readiness_level: { id: 15 },
        }),
      );
    });

    it('should return NOT_FOUND when innovation development record does not exist', async () => {
      const resultId = 999;
      const innovationDevDto: InnovationDevelopmentDto = {
        result_innovation_dev_id: 1882,
        innovation_nature_id: 15,
        innovation_type_id: 13,
        innovation_type_name: 'Capacity development innovation',
        innovation_developers: 'Ms. Yodalieva Markhabo',
        innovation_readiness_level_id: 12,
        level: '1',
        name: 'Prototype',
        budget_id: 1,
        kind_cash: 1000000,
        is_determined: true,
        project_id: 1,
      };

      (
        mockResultsInnovationsDevRepository.InnovationDevExists as jest.Mock
      ).mockResolvedValueOnce(null);

      const result = await service.updateInnovationDevPartial(
        resultId,
        innovationDevDto,
        userTest,
      );

      expect(result.status).toBe(HttpStatus.NOT_FOUND);
      expect(result.message).toBe('Innovation development record not found');
      expect(result.response).toEqual({});
      expect(mockResultsInnovationsDevRepository.save).not.toHaveBeenCalled();
      expect(mockResultsInnovationsDevRepository.update).not.toHaveBeenCalled();
    });

    it('should handle undefined fields correctly (only update defined fields)', async () => {
      const resultId = 100;
      const innovationDevDto: Partial<InnovationDevelopmentDto> = {
        result_innovation_dev_id: 1882,
        innovation_nature_id: 15,
        innovation_readiness_level_id: 12,
      };

      const mockCopy = createMockCopy();

      const updatedMock = {
        ...mockCopy,
        innovation_nature_id: 15,
        innovation_readiness_level_id: 12,
        innovation_developers: 'Original Developer',
        readiness_level: '0',
        last_updated_by: userTest.id,
      };

      setupPersistMocks(mockCopy, updatedMock);

      const result = await service.updateInnovationDevPartial(
        resultId,
        innovationDevDto as InnovationDevelopmentDto,
        userTest,
      );

      expect(result.status).toBe(HttpStatus.OK);
      expect(mockResultsInnovationsDevRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          last_updated_by: userTest.id,
          innovation_nature: { code: 15 },
          innovation_readiness_level: { id: 12 },
        }),
      );
    });

    it('should handle errors and return error response', async () => {
      const resultId = 100;
      const innovationDevDto: InnovationDevelopmentDto = {
        result_innovation_dev_id: 1882,
        innovation_nature_id: 15,
        innovation_type_id: 13,
        innovation_type_name: 'Capacity development innovation',
        innovation_developers: 'Ms. Yodalieva Markhabo',
        innovation_readiness_level_id: 12,
        level: '1',
        name: 'Prototype',
        budget_id: 1,
        kind_cash: 1000000,
        is_determined: true,
        project_id: 1,
      };

      const error = new Error('Database connection failed');
      (
        mockResultsInnovationsDevRepository.InnovationDevExists as jest.Mock
      ).mockRejectedValueOnce(error);

      const result = await service.updateInnovationDevPartial(
        resultId,
        innovationDevDto,
        userTest,
      );

      expect(mockHandlersError.returnErrorRes).toHaveBeenCalledWith({
        error,
        debug: true,
      });
      expect(result.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('should always update last_updated_by with user id', async () => {
      const resultId = 100;
      const innovationDevDto: Partial<InnovationDevelopmentDto> = {
        result_innovation_dev_id: 1882,
      };

      const mockCopy = createMockCopy();
      setupPersistMocks(mockCopy, {
        ...mockCopy,
        last_updated_by: userTest.id,
      });

      await service.updateInnovationDevPartial(
        resultId,
        innovationDevDto as InnovationDevelopmentDto,
        userTest,
      );

      expect(mockResultsInnovationsDevRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          last_updated_by: userTest.id,
        }),
      );
    });
  });

  describe('saveInnovationDev', () => {
    it('should persist typology and readiness relations when creating a new record', async () => {
      const savedRecord = { result_innovation_dev_id: 5001 };

      (
        mockResultsInnovationsDevRepository.InnovationDevExists as jest.Mock
      ).mockResolvedValueOnce(undefined);
      (
        mockResultsInnovationsDevRepository.save as jest.Mock
      ).mockResolvedValueOnce(savedRecord);

      await service.saveInnovationDev(
        {
          innovation_nature_id: 12,
          innovation_readiness_level_id: 11,
          innovation_characterization_id: 3,
          is_new_variety: true,
          number_of_varieties: 2,
          innovatonUse: { actors: [], organization: [], measures: [] },
          reference_materials: [],
          bilateral_expected_investment: [],
          ...buildInnovationDevQuestions(),
        } as any,
        8563,
        userTest,
      );

      expect(mockResultsInnovationsDevRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          is_new_variety: true,
          number_of_varieties: 2,
          innovation_nature: { code: 12 },
          innovation_readiness_level: { id: 11 },
          innovation_characterization: { id: 3 },
        }),
      );
    });

    it('should persist typology relation when updating an existing record', async () => {
      const mockCopy = createMockCopy();
      const updatedMock = {
        ...mockCopy,
        innovation_nature_id: 12,
        is_new_variety: true,
        number_of_varieties: 2,
      };

      setupPersistMocks(mockCopy, updatedMock);

      await service.saveInnovationDev(
        {
          innovation_nature_id: 12,
          is_new_variety: true,
          number_of_varieties: 2,
          innovatonUse: { actors: [], organization: [], measures: [] },
          reference_materials: [],
          bilateral_expected_investment: [],
          ...buildInnovationDevQuestions(),
        } as any,
        8563,
        userTest,
      );

      expect(mockResultsInnovationsDevRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          is_new_variety: true,
          number_of_varieties: 2,
          innovation_nature: { code: 12 },
        }),
      );
    });
  });
});
