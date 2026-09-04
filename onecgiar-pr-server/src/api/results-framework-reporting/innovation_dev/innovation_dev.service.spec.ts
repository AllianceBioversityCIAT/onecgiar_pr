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
  let mockResultAnswerRepository: {
    find: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };
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

  /** One selectable option of a questionnaire question, as the client sends it back. */
  const optionWithId = (result_question_id: number) => ({
    result_question_id,
    answer_boolean: true,
    answer_text: null,
    subOptions: [],
  });

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
      update: jest.fn().mockResolvedValue(undefined),
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

    /**
     * P2-3557 — the reduced 2026 form is served WITHOUT `q4` in
     * `responsible_innovation_and_scaling` (question 137 retired, no replacement), and
     * the client echoes back exactly what the GET handed it. Naming the four slots one
     * by one dereferenced the absent slot and killed the whole section save with a 500,
     * so nothing after it ran either — not the evidence, not the investment.
     *
     * Measured on prtest 2 Sep 2026: 13 of 13 sampled phase-2026 Innovation Development
     * results carry q1..q3 only; every phase-2025 one still carries q1..q4.
     */
    const buildReduced2026Questions = () => ({
      responsible_innovation_and_scaling: {
        q1: { radioButtonValue: 501, options: [optionWithId(501)] },
        q2: { radioButtonValue: 502, options: [optionWithId(502)] },
        q3: { radioButtonValue: 503, options: [optionWithId(503)] },
        // no q4 — this is the shape the 2026 GET actually serves
      },
      intellectual_property_rights: {
        q1: { radioButtonValue: 601, options: [optionWithId(601)] },
        q2: { radioButtonValue: 602, options: [optionWithId(602)] },
        q3: { radioButtonValue: 603, options: [optionWithId(603)] },
        q4: { radioButtonValue: 604, options: [optionWithId(604)] },
      },
      innovation_team_diversity: {
        radioButtonValue: 701,
        options: [optionWithId(701)],
      },
      megatrends: { radioButtonValue: 801, options: [optionWithId(801)] },
    });

    it('saves the 2026 form that arrives without q4 instead of answering 500', async () => {
      const mockCopy = createMockCopy();
      setupPersistMocks(mockCopy, { ...mockCopy });

      const result = await service.saveInnovationDev(
        {
          innovatonUse: { actors: [], organization: [], measures: [] },
          reference_materials: [],
          bilateral_expected_investment: [],
          ...buildReduced2026Questions(),
        } as any,
        11031,
        userTest,
      );

      // The exact failure seen on prtest for result 8563 / id 11031:
      //   500 "Cannot read properties of undefined (reading 'radioButtonValue')"
      expect(result.message).not.toMatch(/radioButtonValue/);
      expect(result.status).toBe(HttpStatus.CREATED);
    });

    it('persists every question the 2026 payload carries and skips only the absent slot', async () => {
      const mockCopy = createMockCopy();
      setupPersistMocks(mockCopy, { ...mockCopy });

      await service.saveInnovationDev(
        {
          innovatonUse: { actors: [], organization: [], measures: [] },
          reference_materials: [],
          bilateral_expected_investment: [],
          ...buildReduced2026Questions(),
        } as any,
        11031,
        userTest,
      );

      // 3 scaling + 4 IPR + diversity + megatrends = 9 questions, q4 of scaling excluded
      const savedQuestionIds = (
        mockResultAnswerRepository.save.mock.calls as any[][]
      ).map(([answer]) => answer.result_question_id);

      expect(savedQuestionIds.sort((a, b) => a - b)).toEqual([
        501, 502, 503, 601, 602, 603, 604, 701, 801,
      ]);
    });

    it('does not touch an absent question, so its stored answers survive the save', async () => {
      const mockCopy = createMockCopy();
      setupPersistMocks(mockCopy, { ...mockCopy });

      const result = await service.saveInnovationDev(
        {
          innovatonUse: { actors: [], organization: [], measures: [] },
          reference_materials: [],
          bilateral_expected_investment: [],
          ...buildReduced2026Questions(),
        } as any,
        11031,
        userTest,
      );

      // Without this the assertions below pass vacuously on the broken code, which wrote
      // nothing at all because it threw on the absent slot before reaching any question.
      expect(result.status).toBe(HttpStatus.CREATED);

      // An absent slot must produce no write of ANY kind for its questions: both write
      // paths in saveOptionsAndSubOptions deactivate the stored answers of the question
      // they touch, so calling it for a question the client never sent would delete
      // answers the user still has rather than merely skipping it.
      const touchedByUpdate = (
        mockResultAnswerRepository.update.mock.calls as any[][]
      ).map(([criteria]) => criteria.result_question_id);
      const touchedBySave = (
        mockResultAnswerRepository.save.mock.calls as any[][]
      ).map(([answer]) => answer.result_question_id);

      expect(touchedByUpdate).not.toContain(504);
      expect(touchedBySave).not.toContain(504);
      // and the questions that WERE sent are still written, so this is not a blanket skip
      expect(touchedBySave).toContain(503);
    });

    it('survives a group that goes missing entirely, in either direction', async () => {
      const mockCopy = createMockCopy();
      setupPersistMocks(mockCopy, { ...mockCopy });

      const result = await service.saveInnovationDev(
        {
          innovatonUse: { actors: [], organization: [], measures: [] },
          reference_materials: [],
          bilateral_expected_investment: [],
          // megatrends is already hidden from the 2026 form on the client, and IPR is the
          // group queued to lose a slot next (P2-3513): both must be survivable.
          responsible_innovation_and_scaling: {
            q1: { radioButtonValue: 501, options: [optionWithId(501)] },
          },
          intellectual_property_rights: undefined,
          innovation_team_diversity: undefined,
        } as any,
        11031,
        userTest,
      );

      expect(result.status).toBe(HttpStatus.CREATED);
      expect(
        (mockResultAnswerRepository.save.mock.calls as any[][]).map(
          ([a]) => a.result_question_id,
        ),
      ).toEqual([501]);
    });

    it('saves a fifth slot if the questionnaire ever grows one', async () => {
      const mockCopy = createMockCopy();
      setupPersistMocks(mockCopy, { ...mockCopy });

      await service.saveInnovationDev(
        {
          innovatonUse: { actors: [], organization: [], measures: [] },
          reference_materials: [],
          bilateral_expected_investment: [],
          responsible_innovation_and_scaling: {
            q1: { radioButtonValue: 501, options: [optionWithId(501)] },
            q5: { radioButtonValue: 505, options: [optionWithId(505)] },
          },
        } as any,
        11031,
        userTest,
      );

      expect(
        (mockResultAnswerRepository.save.mock.calls as any[][]).map(
          ([a]) => a.result_question_id,
        ),
      ).toEqual([501, 505]);
    });
  });

  describe('getInnovationDev', () => {
    /**
     * P2-3556 — the `results_innovations_dev` row only exists once the section has been
     * saved at least once, so `InnovationDevExists` legitimately returns `undefined` for a
     * result nobody has filled in yet. The v2 GET used to dereference that `undefined`
     * while gating the scaling studies, answering 500 and leaving the form blank with no
     * message on screen.
     */
    const wireGetDependencies = (overrides: Record<string, any> = {}) => {
      const scalingStudyUrlsRepo = { find: jest.fn().mockResolvedValue([]) };
      const deps = {
        _evidenceRepository: { find: jest.fn().mockResolvedValue([]) },
        _resultRepository: {
          ...mockResultRepository,
          getResultById: jest.fn().mockResolvedValue({ id: 11028 }),
        },
        _resultActorRepository: { find: jest.fn().mockResolvedValue([]) },
        _resultIpMeasureRepository: { find: jest.fn().mockResolvedValue([]) },
        _resultByIntitutionsTypeRepository: {
          find: jest.fn().mockResolvedValue([]),
        },
        _resultByInitiativeRepository: {
          find: jest.fn().mockResolvedValue([]),
        },
        _resultInitiativesBudgetRepository: {
          find: jest.fn().mockResolvedValue([]),
        },
        _resultBilateralBudgetRepository: {
          find: jest.fn().mockResolvedValue([]),
        },
        _resultByIntitutionsRepository: {
          find: jest.fn().mockResolvedValue([]),
        },
        _resultInstitutionsBudgetRepository: {
          find: jest.fn().mockResolvedValue([]),
        },
        _resultScalingStudyUrlsRepository: scalingStudyUrlsRepo,
        _resultsByCentersRepository: {
          findOne: jest.fn().mockResolvedValue(null),
        },
        ...overrides,
      };
      Object.assign(service as any, deps);
      (
        mockResultsInnovationsDevRepository.findOne as jest.Mock
      ).mockResolvedValue(null);
      return deps;
    };

    it('answers 200 with a usable, all-null section when the result has no innovation-dev row', async () => {
      const deps = wireGetDependencies();
      (
        mockResultsInnovationsDevRepository.InnovationDevExists as jest.Mock
      ).mockResolvedValueOnce(undefined);

      const res = await service.getInnovationDev(11028);

      expect(res.status).toBe(HttpStatus.OK);
      expect(mockHandlersError.returnErrorRes).not.toHaveBeenCalled();
      // The keys the form binds to must be present (null), not missing.
      expect(res.response).toEqual(
        expect.objectContaining({
          result_innovation_dev_id: null,
          results_id: 11028,
          short_title: null,
          innovation_characterization_id: null,
          innovation_nature_id: null,
          innovation_readiness_level_id: null,
          is_new_variety: null,
          number_of_varieties: null,
          innovation_developers: null,
          innovation_collaborators: null,
          evidences_justification: null,
          has_scaling_studies: null,
          innovation_acknowledgement: null,
          innovation_pdf: null,
          innovation_user_to_be_determined: null,
          previous_irl: null,
          scaling_studies_urls: [],
        }),
      );
      // Everything that lives outside that row still has to be delivered.
      expect(res.response).toHaveProperty('innovatonUse');
      expect(res.response).toHaveProperty('pictures');
      expect(res.response).toHaveProperty('reference_materials');
      expect(res.response).toHaveProperty('initiative_expected_investment');
      expect(res.response).toHaveProperty('has_lead_center', false);
      expect(res.response).toHaveProperty('ip_support_center_id', null);
      // No row means no PK to look scaling studies up by.
      expect(
        deps._resultScalingStudyUrlsRepository.find,
      ).not.toHaveBeenCalled();
    });

    it('still returns the saved section and its scaling studies when the row exists', async () => {
      const deps = wireGetDependencies();
      deps._resultScalingStudyUrlsRepository.find.mockResolvedValueOnce([
        { study_url: 'https://example.org/study-1' },
      ]);
      (
        mockResultsInnovationsDevRepository.InnovationDevExists as jest.Mock
      ).mockResolvedValueOnce({
        result_innovation_dev_id: 2097,
        results_id: 11031,
        short_title: 'Short name',
        is_new_variety: 1,
        innovation_readiness_level_id: 17, // Level_6
      });

      const res = await service.getInnovationDev(11031);

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.response).toEqual(
        expect.objectContaining({
          result_innovation_dev_id: 2097,
          short_title: 'Short name',
          is_new_variety: true,
          innovation_readiness_level_id: 17,
          scaling_studies_urls: ['https://example.org/study-1'],
        }),
      );
      expect(deps._resultScalingStudyUrlsRepository.find).toHaveBeenCalledWith({
        where: { result_innov_dev_id: 2097, is_active: true },
      });
    });

    it('does not look for scaling studies when the saved row is below readiness level 6', async () => {
      const deps = wireGetDependencies();
      (
        mockResultsInnovationsDevRepository.InnovationDevExists as jest.Mock
      ).mockResolvedValueOnce({
        result_innovation_dev_id: 2100,
        results_id: 11030,
        is_new_variety: null,
        innovation_readiness_level_id: 12, // Level_1
      });

      const res = await service.getInnovationDev(11030);

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.response).toEqual(
        expect.objectContaining({ scaling_studies_urls: [] }),
      );
      expect(
        deps._resultScalingStudyUrlsRepository.find,
      ).not.toHaveBeenCalled();
    });
  });
});
