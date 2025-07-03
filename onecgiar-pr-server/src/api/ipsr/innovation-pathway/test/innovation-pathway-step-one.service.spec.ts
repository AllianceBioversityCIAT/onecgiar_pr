import { Test, TestingModule } from '@nestjs/testing';
import { InnovationPathwayStepOneService } from '../innovation-pathway-step-one.service';
import { ResultRepository } from '../../../results/result.repository';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultRegionRepository } from '../../../results/result-regions/result-regions.repository';
import { ResultCountryRepository } from '../../../results/result-countries/result-countries.repository';
import { InnovationPackagingExpertRepository } from '../../innovation-packaging-experts/repositories/innovation-packaging-expert.repository';
import { ExpertisesRepository } from '../../innovation-packaging-experts/repositories/expertises.repository';
import { VersionsService } from '../../../results/versions/versions.service';
import { ResultInnovationPackageRepository } from '../../result-innovation-package/repositories/result-innovation-package.repository';
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
import { ClarisaInstitutionsTypeRepository } from '../../../../clarisa/clarisa-institutions-type/ClariasaInstitutionsType.repository';
import { ResultByInitiativesRepository } from '../../../results/results_by_inititiatives/resultByInitiatives.repository';
import { ClarisaInstitutionsRepository } from '../../../../clarisa/clarisa-institutions/ClariasaInstitutions.repository';
import { ResultIpExpertisesRepository } from '../../innovation-packaging-experts/repositories/result-ip-expertises.repository';
import { VersioningService } from '../../../versioning/versioning.service';
import { ResultCountrySubnationalRepository } from '../../../results/result-countries-sub-national/repositories/result-country-subnational.repository';
import { ResultInnovationPackageService } from '../../result-innovation-package/result-innovation-package.service';
import { InnovationPathwayStepThreeService } from '../innovation-pathway-step-three.service';
import { ResultIpExpertWorkshopOrganizedRepostory } from '../repository/result-ip-expert-workshop-organized.repository';
import { EvidencesRepository } from '../../../results/evidences/evidences.repository';
import { HttpStatus } from '@nestjs/common';
import { TokenDto } from '../../../../shared/globalInterfaces/token.dto';
import { UpdateInnovationPathwayDto } from '../dto/update-innovation-pathway.dto';

describe('InnovationPathwayStepOneService', () => {
  let service: InnovationPathwayStepOneService;
  let resultRepository: ResultRepository;
  let ipsrRepository: IpsrRepository;
  let resultRegionRepository: ResultRegionRepository;
  let resultCountryRepository: ResultCountryRepository;

  const mockHandlersError = {
    returnErrorRes: jest.fn(),
  };

  const mockResultRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockResultRegionRepository = {
    getResultRegionByResultId: jest.fn(),
  };

  const mockResultCountryRepository = {
    getResultCountriesByResultId: jest.fn(),
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

  const mockVersionsService = {
    findOne: jest.fn(),
  };

  const mockResultInnovationPackageRepository = {
    find: jest.fn(),
    findBy: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockIpsrRepository = {
    findOneBy: jest.fn(),
    getInnovationCoreStepOne: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockResultByIntitutionsRepository = {
    getGenericAllResultByInstitutionByRole: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockResultByInstitutionsByDeliveriesTypeRepository = {
    getDeliveryByResultByInstitution: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockResultIpEoiOutcomeRepository = {
    getEoiOutcomes: jest.fn(),
  };

  const mockResultIpAAOutcomeRepository = {
    retrieveAaOutcomes: jest.fn(),
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

  const mockClarisaInstitutionsTypeRepository = {
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

  const mockClarisaInstitutionsRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockResultIpExpertisesRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockVersioningService = {
    $_findActivePhase: jest.fn(),
  };

  const mockResultCountrySubnationalRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockResultInnovationPackageService = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockInnovationPathwayStepThreeService = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockResultIpExpertWorkshopOrganizedRepostory = {
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InnovationPathwayStepOneService,
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
          provide: VersionsService,
          useValue: mockVersionsService,
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
          provide: ClarisaInstitutionsTypeRepository,
          useValue: mockClarisaInstitutionsTypeRepository,
        },
        {
          provide: ResultByInitiativesRepository,
          useValue: mockResultByInitiativesRepository,
        },
        {
          provide: ClarisaInstitutionsRepository,
          useValue: mockClarisaInstitutionsRepository,
        },
        {
          provide: ResultIpExpertisesRepository,
          useValue: mockResultIpExpertisesRepository,
        },
        {
          provide: VersioningService,
          useValue: mockVersioningService,
        },
        {
          provide: ResultCountrySubnationalRepository,
          useValue: mockResultCountrySubnationalRepository,
        },
        {
          provide: ResultInnovationPackageService,
          useValue: mockResultInnovationPackageService,
        },
        {
          provide: InnovationPathwayStepThreeService,
          useValue: mockInnovationPathwayStepThreeService,
        },
        {
          provide: ResultIpExpertWorkshopOrganizedRepostory,
          useValue: mockResultIpExpertWorkshopOrganizedRepostory,
        },
        {
          provide: EvidencesRepository,
          useValue: mockEvidencesRepository,
        },
      ],
    }).compile();

    service = module.get<InnovationPathwayStepOneService>(InnovationPathwayStepOneService);
    resultRepository = module.get<ResultRepository>(ResultRepository);
    ipsrRepository = module.get<IpsrRepository>(IpsrRepository);
    resultRegionRepository = module.get<ResultRegionRepository>(ResultRegionRepository);
    resultCountryRepository = module.get<ResultCountryRepository>(ResultCountryRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStepOne', () => {
    it('should return step one data successfully', async () => {
      const resultId = 1;
      const mockResult = {
        id: 1,
        title: 'Test Result',
        geographic_scope_id: 1,
        is_active: true,
      };

      const mockResultByInnovationPackage = {
        result_by_innovation_package_id: 1,
        result_innovation_package_id: 1,
      };

      const mockCoreResult = {
        id: 1,
        title: 'Core Result',
      };

      const mockRegions = [{ id: 1, name: 'Region 1' }];
      const mockCountries = [{ id: 1, name: 'Country 1' }];
      const mockEoiOutcomes = [{ id: 1, outcome: 'Outcome 1' }];
      const mockResultInnovationPackage = [{ id: 1, package_id: 1 }];
      const mockInstitutions = [{ id: 1, institution_id: 1 }];
      const mockDeliveries = [];
      const mockSubNationalCounties = [];

      jest.spyOn(ipsrRepository, 'findOneBy').mockResolvedValue(mockResultByInnovationPackage);
      jest.spyOn(resultRepository, 'findOne').mockResolvedValue(mockResult);
      jest.spyOn(ipsrRepository, 'getInnovationCoreStepOne').mockResolvedValue(mockCoreResult);
      jest.spyOn(resultRegionRepository, 'getResultRegionByResultId').mockResolvedValue(mockRegions);
      jest.spyOn(resultCountryRepository, 'getResultCountriesByResultId').mockResolvedValue(mockCountries);
      jest.spyOn(mockResultIpEoiOutcomeRepository, 'getEoiOutcomes').mockResolvedValue(mockEoiOutcomes);
      jest.spyOn(mockResultInnovationPackageRepository, 'findBy').mockResolvedValue(mockResultInnovationPackage);
      jest.spyOn(mockResultByIntitutionsRepository, 'getGenericAllResultByInstitutionByRole').mockResolvedValue(mockInstitutions);
      jest.spyOn(mockResultByInstitutionsByDeliveriesTypeRepository, 'getDeliveryByResultByInstitution').mockResolvedValue(mockDeliveries);
      jest.spyOn(mockResultCountrySubnationalRepository, 'find').mockResolvedValue(mockSubNationalCounties);

      const result = await service.getStepOne(resultId);

      expect(result).toBeDefined();
      expect(result.status).toBe(HttpStatus.OK);
      expect(ipsrRepository.findOneBy).toHaveBeenCalledWith({
        result_innovation_package_id: resultId,
      });
      expect(resultRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: resultId,
          is_active: true,
        },
      });
    });

    it('should return NOT_FOUND when result does not exist', async () => {
      const resultId = 999;

      jest.spyOn(ipsrRepository, 'findOneBy').mockResolvedValue({
        result_by_innovation_package_id: 1,
        result_innovation_package_id: 1,
      });
      jest.spyOn(resultRepository, 'findOne').mockResolvedValue(null);

      const result = await service.getStepOne(resultId);

      expect(result).toBeDefined();
      expect(result.status).toBe(HttpStatus.NOT_FOUND);
      expect(result.message).toBe('The result was not found');
      expect(result.response).toBeNull();
    });

    it('should handle errors and return error response', async () => {
      const resultId = 1;
      const mockError = new Error('Database error');

      jest.spyOn(ipsrRepository, 'findOneBy').mockRejectedValue(mockError);
      jest.spyOn(mockHandlersError, 'returnErrorRes').mockReturnValue({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      });

      const result = await service.getStepOne(resultId);

      expect(mockHandlersError.returnErrorRes).toHaveBeenCalledWith({
        error: mockError,
        debug: true,
      });
    });
  });

  describe('updateMain', () => {
    it('should update main information successfully', async () => {
      const resultId = 1;
      const updateDto: UpdateInnovationPathwayDto = {
        result_id: 1,
        geographic_scope_id: 1,
        regions: [],
        countries: [],
        result_ip_innovation_packaging_experts: [],
      };
      const user: TokenDto = {
        id: 1,
        email: 'test@test.com',
      };

      const mockResult = {
        id: 1,
        title: 'Test Result',
        is_active: true,
      };

      const mockVersion = {
        id: 1,
        version_name: '1.0',
      };

      jest.spyOn(resultRepository, 'findOne').mockResolvedValue(mockResult);
      jest.spyOn(mockVersioningService, '$_findActivePhase').mockResolvedValue(mockVersion);
      jest.spyOn(service, 'saveGeoScope').mockResolvedValue(undefined);
      jest.spyOn(service, 'saveSpecifyAspiredOutcomesAndImpact').mockResolvedValue(undefined);

      const result = await service.updateMain(resultId, updateDto, user);

      expect(result).toBeDefined();
      expect(result.status).toBe(HttpStatus.OK);
      expect(resultRepository.findOne).toHaveBeenCalledWith({
        where: { id: resultId },
      });
    });

    it('should return NOT_FOUND when result does not exist', async () => {
      const resultId = 999;
      const updateDto: UpdateInnovationPathwayDto = {
        result_id: 999,
        geographic_scope_id: 1,
        regions: [],
        countries: [],
        result_ip_innovation_packaging_experts: [],
      };
      const user: TokenDto = {
        id: 1,
        email: 'test@test.com',
      };

      jest.spyOn(resultRepository, 'findOne').mockResolvedValue(null);

      const result = await service.updateMain(resultId, updateDto, user);

      expect(result).toBeDefined();
      expect(result.status).toBe(HttpStatus.NOT_FOUND);
      expect(result.message).toBe('The result was not found');
    });
  });

  describe('retrieveAaOutcomes', () => {
    it('should retrieve action area outcomes successfully', async () => {
      const resultId = 1;
      const user: TokenDto = {
        id: 1,
        email: 'test@test.com',
      };

      const mockResult = {
        id: 1,
        title: 'Test Result',
        is_active: true,
      };

      const mockResultByIp = {
        result_by_innovation_package_id: 1,
        result_id: 1,
      };

      const mockCoreResultInitiative = {
        result_id: 1,
        initiative_id: 1,
      };

      const mockRetrieveOutcomes = [
        { id: 1, outcome: 'Outcome 1' },
        { id: 2, outcome: 'Outcome 2' },
      ];

      jest.spyOn(resultRepository, 'findOne').mockResolvedValue(mockResult);
      jest.spyOn(ipsrRepository, 'findOneBy').mockResolvedValue(mockResultByIp);
      jest.spyOn(mockResultByInitiativesRepository, 'findOne').mockResolvedValue(mockCoreResultInitiative);
      jest.spyOn(mockResultIpAAOutcomeRepository, 'retrieveAaOutcomes').mockResolvedValue(mockRetrieveOutcomes);

      const result = await service.retrieveAaOutcomes(resultId, user);

      expect(result).toBeDefined();
      expect(result.status).toBe(HttpStatus.OK);
      expect(result.message).toBe('The retrieve of Action Areas has been successfully completed');
      expect(result.response).toEqual(mockRetrieveOutcomes);
    });

    it('should return NOT_FOUND when result does not exist', async () => {
      const resultId = 999;
      const user: TokenDto = {
        id: 1,
        email: 'test@test.com',
      };

      jest.spyOn(resultRepository, 'findOne').mockResolvedValue(null);

      const result = await service.retrieveAaOutcomes(resultId, user);

      expect(result).toBeDefined();
      expect(result.status).toBe(HttpStatus.NOT_FOUND);
      expect(result.message).toBe('The result was not found');
    });
  });

  describe('utility methods', () => {
    describe('isNullData', () => {
      it('should return true for null data', () => {
        expect(service.isNullData(null)).toBe(true);
      });

      it('should return true for undefined data', () => {
        expect(service.isNullData(undefined)).toBe(true);
      });

      it('should return false for valid data', () => {
        expect(service.isNullData('test')).toBe(false);
        expect(service.isNullData(123)).toBe(false);
        expect(service.isNullData([])).toBe(false);
        expect(service.isNullData({})).toBe(false);
      });
    });

    describe('arrayToStringAnd', () => {
      it('should convert array to string with "and" separator', () => {
        const arrayData = [
          { name: 'Item 1' },
          { name: 'Item 2' },
          { name: 'Item 3' },
        ];

        const result = service.arrayToStringAnd(arrayData);
        expect(result).toBe('Item 1, Item 2 and Item 3');
      });

      it('should handle single item array', () => {
        const arrayData = [{ name: 'Item 1' }];
        const result = service.arrayToStringAnd(arrayData);
        expect(result).toBe('Item 1');
      });

      it('should handle empty array', () => {
        const result = service.arrayToStringAnd([]);
        expect(result).toBe('');
      });
    });
  });
});