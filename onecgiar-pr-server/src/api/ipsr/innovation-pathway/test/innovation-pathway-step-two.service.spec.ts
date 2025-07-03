import { Test, TestingModule } from '@nestjs/testing';
import { InnovationPathwayStepTwoService } from '../innovation-pathway-step-two.service';
import { ResultRepository } from '../../../results/result.repository';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultRegionRepository } from '../../../results/result-regions/result-regions.repository';
import { ResultCountryRepository } from '../../../results/result-countries/result-countries.repository';
import { InnovationPackagingExpertRepository } from '../../innovation-packaging-experts/repositories/innovation-packaging-expert.repository';
import { ExpertisesRepository } from '../../innovation-packaging-experts/repositories/expertises.repository';
import { ResultInnovationPackageRepository } from '../../result-innovation-package/repositories/result-innovation-package.repository';
import { VersionsService } from '../../../results/versions/versions.service';
import { IpsrRepository } from '../../ipsr.repository';
import { ResultByIntitutionsRepository } from '../../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultByInstitutionsByDeliveriesTypeRepository } from '../../../results/result-by-institutions-by-deliveries-type/result-by-institutions-by-deliveries-type.repository';
import { ResultIpEoiOutcomeRepository } from '../repository/result-ip-eoi-outcomes.repository';
import { ResultIpAAOutcomeRepository } from '../repository/result-ip-action-area-outcome.repository';
import { ResultIpSdgTargetRepository } from '../repository/result-ip-sdg-targets.repository';
import { ResultActorRepository } from '../../../results/result-actors/repositories/result-actors.repository';
import { ResultByIntitutionsTypeRepository } from '../../../results/results_by_institution_types/result_by_intitutions_type.repository';
import { ResultIpMeasureRepository } from '../../result-ip-measures/result-ip-measures.repository';
import { ResultIpImpactAreaRepository } from '../repository/result-ip-impact-area-targets.repository';
import { ResultsComplementaryInnovationRepository } from '../../results-complementary-innovations/repositories/results-complementary-innovation.repository';
import { ResultsComplementaryInnovationsFunctionRepository } from '../../results-complementary-innovations-functions/repositories/results-complementary-innovations-function.repository';
import { EvidencesRepository } from '../../../results/evidences/evidences.repository';
import { YearRepository } from '../../../results/years/year.repository';
import { ResultByInitiativesRepository } from '../../../results/results_by_inititiatives/resultByInitiatives.repository';
import { ComplementaryInnovationFunctionsRepository } from '../../results-complementary-innovations-functions/repositories/complementary-innovation-functions.repository';
import { VersioningService } from '../../../versioning/versioning.service';
import { HttpStatus } from '@nestjs/common';
import { TokenDto } from '../../../../shared/globalInterfaces/token.dto';
import { CreateComplementaryInnovationDto } from '../dto/create-complementary-innovation.dto';

describe('InnovationPathwayStepTwoService', () => {
  let service: InnovationPathwayStepTwoService;
  let resultRepository: ResultRepository;
  let ipsrRepository: IpsrRepository;

  const mockHandlersError = {
    returnErrorRes: jest.fn(),
  };

  const mockVersionsService = {
    findOne: jest.fn(),
  };

  const mockResultRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockResultRegionRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockResultCountryRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockInnovationPackagingExpertRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockExpertisesRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockResultInnovationPackageRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockIpsrRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    getInnovationsAndComplementary: jest.fn(),
  };

  const mockResultByIntitutionsRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockResultByInstitutionsByDeliveriesTypeRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockResultIpEoiOutcomeRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockResultIpAAOutcomeRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockResultIpSdgTargetRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockResultActorRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockResultByIntitutionsTypeRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockResultIpMeasureRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockResultIpImpactAreaRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockResultsComplementaryInnovationRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockResultsComplementaryInnovationsFunctionRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockEvidencesRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockYearRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockResultByInitiativesRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockComplementaryInnovationFunctionsRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    getComplementaryInnovationFunctions: jest.fn(),
  };

  const mockVersioningService = {
    $_findActivePhase: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InnovationPathwayStepTwoService,
        {
          provide: VersionsService,
          useValue: mockVersionsService,
        },
        {
          provide: HandlersError,
          useValue: mockHandlersError,
        },
        {
          provide: ResultRepository,
          useValue: mockResultRepository,
        },
        {
          provide: ResultRegionRepository,
          useValue: mockResultRegionRepository,
        },
        {
          provide: ResultCountryRepository,
          useValue: mockResultCountryRepository,
        },
        {
          provide: InnovationPackagingExpertRepository,
          useValue: mockInnovationPackagingExpertRepository,
        },
        {
          provide: ExpertisesRepository,
          useValue: mockExpertisesRepository,
        },
        {
          provide: ResultInnovationPackageRepository,
          useValue: mockResultInnovationPackageRepository,
        },
        {
          provide: IpsrRepository,
          useValue: mockIpsrRepository,
        },
        {
          provide: ResultByIntitutionsRepository,
          useValue: mockResultByIntitutionsRepository,
        },
        {
          provide: ResultByInstitutionsByDeliveriesTypeRepository,
          useValue: mockResultByInstitutionsByDeliveriesTypeRepository,
        },
        {
          provide: ResultIpEoiOutcomeRepository,
          useValue: mockResultIpEoiOutcomeRepository,
        },
        {
          provide: ResultIpAAOutcomeRepository,
          useValue: mockResultIpAAOutcomeRepository,
        },
        {
          provide: ResultIpSdgTargetRepository,
          useValue: mockResultIpSdgTargetRepository,
        },
        {
          provide: ResultActorRepository,
          useValue: mockResultActorRepository,
        },
        {
          provide: ResultByIntitutionsTypeRepository,
          useValue: mockResultByIntitutionsTypeRepository,
        },
        {
          provide: ResultIpMeasureRepository,
          useValue: mockResultIpMeasureRepository,
        },
        {
          provide: ResultIpImpactAreaRepository,
          useValue: mockResultIpImpactAreaRepository,
        },
        {
          provide: ResultsComplementaryInnovationRepository,
          useValue: mockResultsComplementaryInnovationRepository,
        },
        {
          provide: ResultsComplementaryInnovationsFunctionRepository,
          useValue: mockResultsComplementaryInnovationsFunctionRepository,
        },
        {
          provide: EvidencesRepository,
          useValue: mockEvidencesRepository,
        },
        {
          provide: YearRepository,
          useValue: mockYearRepository,
        },
        {
          provide: ResultByInitiativesRepository,
          useValue: mockResultByInitiativesRepository,
        },
        {
          provide: ComplementaryInnovationFunctionsRepository,
          useValue: mockComplementaryInnovationFunctionsRepository,
        },
        {
          provide: VersioningService,
          useValue: mockVersioningService,
        },
      ],
    }).compile();

    service = module.get<InnovationPathwayStepTwoService>(InnovationPathwayStepTwoService);
    resultRepository = module.get<ResultRepository>(ResultRepository);
    ipsrRepository = module.get<IpsrRepository>(IpsrRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findInnovationsAndComplementary', () => {
    it('should return innovations and complementary data successfully', async () => {
      const mockInnovations = [
        { id: 1, title: 'Innovation 1' },
        { id: 2, title: 'Innovation 2' },
      ];

      jest.spyOn(ipsrRepository, 'getInnovationsAndComplementary').mockResolvedValue(mockInnovations);

      const result = await service.findInnovationsAndComplementary();

      expect(result).toBeDefined();
      expect(result.status).toBe(HttpStatus.OK);
      expect(result.response).toEqual(mockInnovations);
      expect(result.message).toBe('The Innovations and Complementary Innovation information has been found.');
      expect(ipsrRepository.getInnovationsAndComplementary).toHaveBeenCalled();
    });

    it('should handle errors and return error response', async () => {
      const mockError = new Error('Database error');

      jest.spyOn(ipsrRepository, 'getInnovationsAndComplementary').mockRejectedValue(mockError);
      jest.spyOn(mockHandlersError, 'returnErrorRes').mockReturnValue({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      });

      const result = await service.findInnovationsAndComplementary();

      expect(mockHandlersError.returnErrorRes).toHaveBeenCalledWith({
        error: mockError,
        debug: true,
      });
    });
  });

  describe('getStepTwoOne', () => {
    it('should return step two data successfully', async () => {
      const resultId = 1;
      const mockStepTwoData = {
        complementary_innovation: [],
        complementary_innovation_enabler_types: [],
      };

      jest.spyOn(ipsrRepository, 'findOne').mockResolvedValue({
        id: 1,
        result_innovation_package_id: resultId,
      });

      const result = await service.getStepTwoOne(resultId);

      expect(result).toBeDefined();
      expect(result.status).toBe(HttpStatus.OK);
      expect(result.message).toBe('The step two one has been found.');
    });

    it('should handle errors in getStepTwoOne', async () => {
      const resultId = 1;
      const mockError = new Error('Database error');

      jest.spyOn(ipsrRepository, 'findOne').mockRejectedValue(mockError);
      jest.spyOn(mockHandlersError, 'returnErrorRes').mockReturnValue({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      });

      const result = await service.getStepTwoOne(resultId);

      expect(mockHandlersError.returnErrorRes).toHaveBeenCalledWith({
        error: mockError,
        debug: true,
      });
    });
  });

  describe('findComplementaryInnovationFuctions', () => {
    it('should return complementary innovation functions successfully', async () => {
      const mockFunctions = [
        { id: 1, name: 'Function 1', group: 'Group A' },
        { id: 2, name: 'Function 2', group: 'Group B' },
      ];

      jest.spyOn(mockComplementaryInnovationFunctionsRepository, 'getComplementaryInnovationFunctions')
        .mockResolvedValue(mockFunctions);

      const result = await service.findComplementaryInnovationFuctions();

      expect(result).toBeDefined();
      expect(result.status).toBe(HttpStatus.OK);
      expect(result.response).toEqual(mockFunctions);
      expect(result.message).toBe('The Complementary Innovation Functions have been found.');
    });

    it('should handle errors in findComplementaryInnovationFuctions', async () => {
      const mockError = new Error('Database error');

      jest.spyOn(mockComplementaryInnovationFunctionsRepository, 'getComplementaryInnovationFunctions')
        .mockRejectedValue(mockError);
      jest.spyOn(mockHandlersError, 'returnErrorRes').mockReturnValue({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      });

      const result = await service.findComplementaryInnovationFuctions();

      expect(mockHandlersError.returnErrorRes).toHaveBeenCalledWith({
        error: mockError,
        debug: true,
      });
    });
  });

  describe('saveComplementaryInnovation', () => {
    it('should save complementary innovation successfully', async () => {
      const resultId = 1;
      const user: TokenDto = {
        id: 1,
        email: 'test@test.com',
      };
      const saveDto: CreateComplementaryInnovationDto = {
        result_innovation_package_id: resultId,
        complementary_innovation: [
          {
            title: 'Test Innovation',
            is_active: true,
            innovation_id: 1,
            complementary_innovation_enabler_types: [],
          },
        ],
      };

      const mockResult = {
        id: resultId,
        title: 'Test Result',
        is_active: true,
      };

      const mockVersion = {
        id: 1,
        version_name: '1.0',
      };

      jest.spyOn(resultRepository, 'findOne').mockResolvedValue(mockResult);
      jest.spyOn(mockVersioningService, '$_findActivePhase').mockResolvedValue(mockVersion);
      jest.spyOn(mockResultsComplementaryInnovationRepository, 'save').mockResolvedValue({
        id: 1,
        title: 'Test Innovation',
      });

      const result = await service.saveComplementaryInnovation(resultId, user, saveDto);

      expect(result).toBeDefined();
      expect(result.status).toBe(HttpStatus.OK);
      expect(result.message).toBe('The Complementary Innovation have been saved.');
      expect(resultRepository.findOne).toHaveBeenCalledWith({
        where: { id: resultId },
      });
    });

    it('should return NOT_FOUND when result does not exist', async () => {
      const resultId = 999;
      const user: TokenDto = {
        id: 1,
        email: 'test@test.com',
      };
      const saveDto: CreateComplementaryInnovationDto = {
        result_innovation_package_id: resultId,
        complementary_innovation: [],
      };

      jest.spyOn(resultRepository, 'findOne').mockResolvedValue(null);

      const result = await service.saveComplementaryInnovation(resultId, user, saveDto);

      expect(result).toBeDefined();
      expect(result.status).toBe(HttpStatus.NOT_FOUND);
      expect(result.message).toBe('The result was not found');
    });

    it('should handle errors in saveComplementaryInnovation', async () => {
      const resultId = 1;
      const user: TokenDto = {
        id: 1,
        email: 'test@test.com',
      };
      const saveDto: CreateComplementaryInnovationDto = {
        result_innovation_package_id: resultId,
        complementary_innovation: [],
      };
      const mockError = new Error('Database error');

      jest.spyOn(resultRepository, 'findOne').mockRejectedValue(mockError);
      jest.spyOn(mockHandlersError, 'returnErrorRes').mockReturnValue({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      });

      const result = await service.saveComplementaryInnovation(resultId, user, saveDto);

      expect(mockHandlersError.returnErrorRes).toHaveBeenCalledWith({
        error: mockError,
        debug: true,
      });
    });
  });

  describe('saveSetepTowOne', () => {
    it('should save step two data successfully', async () => {
      const resultId = 1;
      const user: TokenDto = {
        id: 1,
        email: 'test@test.com',
      };
      const updateDto = {
        result_innovation_package_id: resultId,
        complementary_innovation: [],
      };

      const mockResult = {
        id: resultId,
        title: 'Test Result',
        is_active: true,
      };

      const mockVersion = {
        id: 1,
        version_name: '1.0',
      };

      jest.spyOn(resultRepository, 'findOne').mockResolvedValue(mockResult);
      jest.spyOn(mockVersioningService, '$_findActivePhase').mockResolvedValue(mockVersion);

      const result = await service.saveSetepTowOne(resultId, user, updateDto);

      expect(result).toBeDefined();
      expect(result.status).toBe(HttpStatus.OK);
      expect(result.message).toBe('The step two one has been saved.');
      expect(resultRepository.findOne).toHaveBeenCalledWith({
        where: { id: resultId },
      });
    });

    it('should return NOT_FOUND when result does not exist in saveSetepTowOne', async () => {
      const resultId = 999;
      const user: TokenDto = {
        id: 1,
        email: 'test@test.com',
      };
      const updateDto = {
        result_innovation_package_id: resultId,
        complementary_innovation: [],
      };

      jest.spyOn(resultRepository, 'findOne').mockResolvedValue(null);

      const result = await service.saveSetepTowOne(resultId, user, updateDto);

      expect(result).toBeDefined();
      expect(result.status).toBe(HttpStatus.NOT_FOUND);
      expect(result.message).toBe('The result was not found');
    });
  });
});