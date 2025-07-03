import { Test, TestingModule } from '@nestjs/testing';
import { InnovationPathwayStepThreeService } from '../innovation-pathway-step-three.service';
import { ResultRepository } from '../../../results/result.repository';
import { HandlersError, ReturnResponse } from '../../../../shared/handlers/error.utils';
import { ResultInnovationPackageRepository } from '../../result-innovation-package/repositories/result-innovation-package.repository';
import { VersionsService } from '../../../results/versions/versions.service';
import { ResultByIntitutionsRepository } from '../../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultIpSdgTargetRepository } from '../repository/result-ip-sdg-targets.repository';
import { ResultsComplementaryInnovationRepository } from '../../results-complementary-innovations/repositories/results-complementary-innovation.repository';
import { ResultsByIpInnovationUseMeasureRepository } from '../../results-by-ip-innovation-use-measures/results-by-ip-innovation-use-measure.repository';
import { ResultsIpActorRepository } from '../../results-ip-actors/results-ip-actor.repository';
import { ResultsIpInstitutionTypeRepository } from '../../results-ip-institution-type/results-ip-institution-type.repository';
import { EvidencesRepository } from '../../../results/evidences/evidences.repository';
import { ResultIpExpertWorkshopOrganizedRepostory } from '../repository/result-ip-expert-workshop-organized.repository';
import { VersioningService } from '../../../versioning/versioning.service';
import { IpsrRepository } from '../../ipsr.repository';
import { HttpStatus } from '@nestjs/common';
import { TokenDto } from '../../../../shared/globalInterfaces/token.dto';
import { SaveStepTwoThree } from '../dto/save-step-three.dto';
import { UpdateInnovationPathwayDto } from '../dto/update-innovation-pathway.dto';

describe('InnovationPathwayStepThreeService', () => {
  let service: InnovationPathwayStepThreeService;
  let resultRepository: ResultRepository;
  let ipsrRepository: IpsrRepository;

  const mockHandlersError = {
    returnErrorRes: jest.fn(),
  };

  const mockReturnResponse = {
    format: jest.fn(),
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
    findOneBy: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    getStepThree: jest.fn(),
  };

  const mockResultByIntitutionsRepository = {
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

  const mockResultsComplementaryInnovationRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockResultsByIpInnovationUseMeasureRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockResultsIpActorRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockResultsIpInstitutionTypeRepository = {
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

  const mockResultIpExpertWorkshopRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockVersioningService = {
    $_findActivePhase: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InnovationPathwayStepThreeService,
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
          provide: ResultIpSdgTargetRepository,
          useValue: mockResultIpSdgTargetRepository,
        },
        {
          provide: ResultsComplementaryInnovationRepository,
          useValue: mockResultsComplementaryInnovationRepository,
        },
        {
          provide: ResultsByIpInnovationUseMeasureRepository,
          useValue: mockResultsByIpInnovationUseMeasureRepository,
        },
        {
          provide: ResultsIpActorRepository,
          useValue: mockResultsIpActorRepository,
        },
        {
          provide: ResultsIpInstitutionTypeRepository,
          useValue: mockResultsIpInstitutionTypeRepository,
        },
        {
          provide: EvidencesRepository,
          useValue: mockEvidencesRepository,
        },
        {
          provide: ResultIpExpertWorkshopOrganizedRepostory,
          useValue: mockResultIpExpertWorkshopRepository,
        },
        {
          provide: ReturnResponse,
          useValue: mockReturnResponse,
        },
        {
          provide: VersioningService,
          useValue: mockVersioningService,
        },
      ],
    }).compile();

    service = module.get<InnovationPathwayStepThreeService>(InnovationPathwayStepThreeService);
    resultRepository = module.get<ResultRepository>(ResultRepository);
    ipsrRepository = module.get<IpsrRepository>(IpsrRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStepThree', () => {
    it('should return step three data successfully', async () => {
      const resultId = 1;
      const mockStepThreeData = {
        innovation_readiness: 1,
        innovation_use: 2,
        actors: [],
        organizations: [],
        measures: [],
      };

      jest.spyOn(ipsrRepository, 'getStepThree').mockResolvedValue(mockStepThreeData);

      const result = await service.getStepThree(resultId);

      expect(result).toBeDefined();
      expect(result.status).toBe(HttpStatus.OK);
      expect(result.response).toEqual(mockStepThreeData);
      expect(result.message).toBe('The step three has been found.');
      expect(ipsrRepository.getStepThree).toHaveBeenCalledWith(resultId);
    });

    it('should handle errors and return error response', async () => {
      const resultId = 1;
      const mockError = new Error('Database error');

      jest.spyOn(ipsrRepository, 'getStepThree').mockRejectedValue(mockError);
      jest.spyOn(mockHandlersError, 'returnErrorRes').mockReturnValue({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      });

      const result = await service.getStepThree(resultId);

      expect(mockHandlersError.returnErrorRes).toHaveBeenCalledWith({
        error: mockError,
        debug: true,
      });
    });
  });

  describe('saveComplementaryinnovation', () => {
    it('should save complementary innovation successfully', async () => {
      const resultId = 1;
      const user: TokenDto = {
        id: 1,
        email: 'test@test.com',
      };
      const saveDto: SaveStepTwoThree = {
        result_innovation_package_id: resultId,
        innovatonUse: {
          current_innovation_readiness_level: 1,
          current_innovation_use_level: 2,
          potential_innovation_readiness_level: 3,
          potential_innovation_use_level: 4,
          actors: [],
          organization: [],
          measures: [],
        },
      };

      const mockResult = {
        id: resultId,
        title: 'Test Result',
        is_active: true,
      };

      const mockVersion = {
        id: 1,
        version_name: '1.0',
        app_module_id: 1,
      };

      jest.spyOn(resultRepository, 'findOne').mockResolvedValue(mockResult);
      jest.spyOn(mockVersioningService, '$_findActivePhase').mockResolvedValue(mockVersion);
      jest.spyOn(service, 'saveInnovationUse').mockResolvedValue(undefined);

      const result = await service.saveComplementaryinnovation(resultId, user, saveDto);

      expect(result).toBeDefined();
      expect(result.status).toBe(HttpStatus.OK);
      expect(result.message).toBe('The step three has been saved.');
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
      const saveDto: SaveStepTwoThree = {
        result_innovation_package_id: resultId,
        innovatonUse: {
          current_innovation_readiness_level: 1,
          current_innovation_use_level: 2,
          potential_innovation_readiness_level: 3,
          potential_innovation_use_level: 4,
          actors: [],
          organization: [],
          measures: [],
        },
      };

      jest.spyOn(resultRepository, 'findOne').mockResolvedValue(null);

      const result = await service.saveComplementaryinnovation(resultId, user, saveDto);

      expect(result).toBeDefined();
      expect(result.status).toBe(HttpStatus.NOT_FOUND);
      expect(result.message).toBe('The result was not found');
    });

    it('should handle errors in saveComplementaryinnovation', async () => {
      const resultId = 1;
      const user: TokenDto = {
        id: 1,
        email: 'test@test.com',
      };
      const saveDto: SaveStepTwoThree = {
        result_innovation_package_id: resultId,
        innovatonUse: {
          current_innovation_readiness_level: 1,
          current_innovation_use_level: 2,
          potential_innovation_readiness_level: 3,
          potential_innovation_use_level: 4,
          actors: [],
          organization: [],
          measures: [],
        },
      };
      const mockError = new Error('Database error');

      jest.spyOn(resultRepository, 'findOne').mockRejectedValue(mockError);
      jest.spyOn(mockHandlersError, 'returnErrorRes').mockReturnValue({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      });

      const result = await service.saveComplementaryinnovation(resultId, user, saveDto);

      expect(mockHandlersError.returnErrorRes).toHaveBeenCalledWith({
        error: mockError,
        debug: true,
      });
    });
  });

  describe('saveinnovationWorkshop', () => {
    it('should save innovation workshop successfully', async () => {
      const user: TokenDto = {
        id: 1,
        email: 'test@test.com',
      };
      const rbi = {
        result_by_innovation_package_id: 1,
        potential_innovation_readiness_level: 3,
        current_innovation_readiness_level: 2,
        current_innovation_use_level: 1,
      };
      const dataId = [1, 2];

      jest.spyOn(ipsrRepository, 'update').mockResolvedValue(undefined);

      await service.saveinnovationWorkshop(user, rbi, dataId);

      expect(ipsrRepository.update).toHaveBeenCalledWith(
        { result_by_innovation_package_id: rbi.result_by_innovation_package_id },
        expect.objectContaining({
          potential_innovation_readiness_level: rbi.potential_innovation_readiness_level,
          current_innovation_readiness_level: rbi.current_innovation_readiness_level,
          current_innovation_use_level: rbi.current_innovation_use_level,
          last_updated_by: user.id,
        }),
      );
    });

    it('should handle errors in saveinnovationWorkshop', async () => {
      const user: TokenDto = {
        id: 1,
        email: 'test@test.com',
      };
      const rbi = {
        result_by_innovation_package_id: 1,
        potential_innovation_readiness_level: 3,
        current_innovation_readiness_level: 2,
        current_innovation_use_level: 1,
      };
      const dataId = [1, 2];
      const mockError = new Error('Database error');

      jest.spyOn(ipsrRepository, 'update').mockRejectedValue(mockError);
      jest.spyOn(mockHandlersError, 'returnErrorRes').mockReturnValue({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      });

      const result = await service.saveinnovationWorkshop(user, rbi, dataId);

      expect(mockHandlersError.returnErrorRes).toHaveBeenCalledWith({
        error: mockError,
        debug: true,
      });
    });
  });

  describe('saveWorkshop', () => {
    it('should save workshop data successfully', async () => {
      const resultId = 1;
      const user: TokenDto = {
        id: 1,
        email: 'test@test.com',
      };
      const updateDto: UpdateInnovationPathwayDto = {
        result_id: resultId,
        result_ip_expert_workshop_organized: [
          {
            how_many_participants: 10,
            how_many_women: 5,
            how_many_men: 5,
            workshop_name: 'Test Workshop',
          },
        ],
        link_workshop_list: 'http://example.com/workshop',
      };

      const mockResult = {
        id: resultId,
        title: 'Test Result',
        is_active: true,
      };

      const mockVersion = {
        id: 1,
        version_name: '1.0',
        app_module_id: 1,
      };

      jest.spyOn(resultRepository, 'findOne').mockResolvedValue(mockResult);
      jest.spyOn(mockVersioningService, '$_findActivePhase').mockResolvedValue(mockVersion);
      jest.spyOn(ipsrRepository, 'findOneBy').mockResolvedValue({
        result_by_innovation_package_id: 1,
      });
      jest.spyOn(ipsrRepository, 'update').mockResolvedValue(undefined);
      jest.spyOn(mockResultIpExpertWorkshopRepository, 'save').mockResolvedValue({
        id: 1,
        workshop_name: 'Test Workshop',
      });

      const result = await service.saveWorkshop(resultId, user, updateDto);

      expect(result).toBeDefined();
      expect(result.status).toBe(HttpStatus.OK);
      expect(result.message).toBe('The workshop has been saved.');
      expect(resultRepository.findOne).toHaveBeenCalledWith({
        where: { id: resultId },
      });
    });

    it('should return NOT_FOUND when result does not exist in saveWorkshop', async () => {
      const resultId = 999;
      const user: TokenDto = {
        id: 1,
        email: 'test@test.com',
      };
      const updateDto: UpdateInnovationPathwayDto = {
        result_id: resultId,
        result_ip_expert_workshop_organized: [],
        link_workshop_list: '',
      };

      jest.spyOn(resultRepository, 'findOne').mockResolvedValue(null);

      const result = await service.saveWorkshop(resultId, user, updateDto);

      expect(result).toBeDefined();
      expect(result.status).toBe(HttpStatus.NOT_FOUND);
      expect(result.message).toBe('The result was not found');
    });
  });

  describe('utility methods', () => {
    describe('validData', () => {
      it('should return original value when data_id includes validation value', () => {
        const result = service.validData(5, [1, 2, 5], [1, 2]);
        expect(result).toBe(5);
      });

      it('should return null when data_id does not include validation value', () => {
        const result = service.validData(5, [3, 4], [1, 2]);
        expect(result).toBeNull();
      });

      it('should return null when originalValue is null', () => {
        const result = service.validData(null, [1, 2], [1, 2]);
        expect(result).toBeNull();
      });

      it('should return null when originalValue is undefined', () => {
        const result = service.validData(undefined, [1, 2], [1, 2]);
        expect(result).toBeNull();
      });
    });
  });
});