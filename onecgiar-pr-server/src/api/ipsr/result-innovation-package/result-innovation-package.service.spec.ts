import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';

import { ResultInnovationPackageService } from './result-innovation-package.service';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';
import { ResultRepository } from '../../../api/results/result.repository';
import { VersionsService } from '../../../api/results/versions/versions.service';
import { ResultByInitiativesRepository } from '../../../api/results/results_by_inititiatives/resultByInitiatives.repository';
import { ResultRegionRepository } from '../../../api/results/result-regions/result-regions.repository';
import { ResultCountryRepository } from '../../../api/results/result-countries/result-countries.repository';
import { IpsrRepository } from '../ipsr.repository';
import { ResultInnovationPackageRepository } from './repositories/result-innovation-package.repository';
import { ResultIpAAOutcomeRepository } from '../innovation-pathway/repository/result-ip-action-area-outcome.repository';
import { ClarisaActionAreaOutcomeRepository } from '../../../clarisa/clarisa-action-area-outcome/clarisa-action-area-outcome.repository';
import { ResultsImpactAreaIndicatorRepository } from '../../../api/results/results-impact-area-indicators/results-impact-area-indicators.repository';
import { ResultIpImpactAreaRepository } from '../innovation-pathway/repository/result-ip-impact-area-targets.repository';
import { ActiveBackstoppingRepository } from './repositories/active-backstopping.repository';
import { consensusInitiativeWorkPackageRepository } from './repositories/consensus-initiative-work-package.repository';
import { RegionalIntegratedRepository } from './repositories/regional-integrated.repository';
import { RegionalLeadershipRepository } from './repositories/regional-leadership.repository';
import { RelevantCountryRepository } from './repositories/relevant-country.repository';
import { ResultByEvidencesRepository } from '../../../api/results/results_by_evidences/result_by_evidences.repository';
import { ResultByIntitutionsRepository } from '../../../api/results/results_by_institutions/result_by_intitutions.repository';
import { ResultByIntitutionsTypeRepository } from '../../../api/results/results_by_institution_types/result_by_intitutions_type.repository';
import { resultValidationRepository } from '../../../api/results/results-validation-module/results-validation-module.repository';
import { ResultIpSdgTargetRepository } from '../innovation-pathway/repository/result-ip-sdg-targets.repository';
import { ResultInitiativeBudgetRepository } from '../../../api/results/result_budget/repositories/result_initiative_budget.repository';
import { UnitTimeRepository } from './repositories/unit_time.repository';
import { TocResultsRepository } from '../../../toc/toc-results/toc-results.repository';
import { YearRepository } from '../../results/years/year.repository';
import { LinkedResultRepository } from '../../results/linked-results/linked-results.repository';
import { EvidencesRepository } from '../../results/evidences/evidences.repository';
import { IpsrService } from '../ipsr.service';
import { ResultsInvestmentDiscontinuedOptionRepository } from '../../results/results-investment-discontinued-options/results-investment-discontinued-options.repository';
import { VersioningService } from '../../versioning/versioning.service';
import { ResultCountrySubnationalRepository } from '../../results/result-countries-sub-national/repositories/result-country-subnational.repository';
import { RoleByUserRepository } from '../../../auth/modules/role-by-user/RoleByUser.repository';

describe('ResultInnovationPackageService', () => {
  let service: ResultInnovationPackageService;

  const repo = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  });

  const mockResultRepository = {
    ...repo(),
    getResultById: jest.fn(),
    getLastResultCode: jest.fn(),
  } as any as jest.Mocked<ResultRepository>;
  const mockVersionsService = {
    $_findActivePhase: jest.fn(),
  } as any as jest.Mocked<VersionsService>;
  const mockResultByInitiativeRepository = {
    findOne: jest.fn(),
    InitiativeByResult: jest.fn(),
    save: jest.fn(),
  } as any as jest.Mocked<ResultByInitiativesRepository>;
  const mockRegionRepository = {
    save: jest.fn(),
  } as any as jest.Mocked<ResultRegionRepository>;
  const mockCountryRepository = {
    save: jest.fn(),
    findOne: jest.fn(),
  } as any as jest.Mocked<ResultCountryRepository>;
  const mockIpsrRepository = {
    save: jest.fn(),
    find: jest.fn(),
  } as any as jest.Mocked<IpsrRepository>;
  const mockRIPRepository = {
    save: jest.fn(),
  } as any as jest.Mocked<ResultInnovationPackageRepository>;
  const mockIpAARepo = {
    mapActionAreaOutcome: jest.fn(),
    save: jest.fn(),
  } as any as jest.Mocked<ResultIpAAOutcomeRepository>;
  const mockClarisaAARepo = {
    find: jest.fn(),
  } as any as jest.Mocked<ClarisaActionAreaOutcomeRepository>;
  const mockImpactIndicatorRepo = {
    mapImpactAreaOutcomeToc: jest.fn(),
  } as any as jest.Mocked<ResultsImpactAreaIndicatorRepository>;
  const mockImpactAreaRepo = {
    save: jest.fn(),
  } as any as jest.Mocked<ResultIpImpactAreaRepository>;
  const mockActiveBackstoppingRepo = {
    find: jest.fn(),
  } as any as jest.Mocked<ActiveBackstoppingRepository>;
  const mockConsensusWPRepo = {
    find: jest.fn(),
  } as any as jest.Mocked<consensusInitiativeWorkPackageRepository>;
  const mockRegionalIntegratedRepo = {
    find: jest.fn(),
  } as any as jest.Mocked<RegionalIntegratedRepository>;
  const mockRegionalLeadershipRepo = {
    find: jest.fn(),
  } as any as jest.Mocked<RegionalLeadershipRepository>;
  const mockRelevantCountryRepo = {
    find: jest.fn(),
  } as any as jest.Mocked<RelevantCountryRepository>;
  const mockByEvidencesRepo =
    {} as any as jest.Mocked<ResultByEvidencesRepository>;
  const mockByInstRepo =
    {} as any as jest.Mocked<ResultByIntitutionsRepository>;
  const mockByInstTypeRepo =
    {} as any as jest.Mocked<ResultByIntitutionsTypeRepository>;
  const mockValidationRepo =
    {} as any as jest.Mocked<resultValidationRepository>;
  const mockSdgRepo = {
    mapSdgsToc: jest.fn(),
    save: jest.fn(),
  } as any as jest.Mocked<ResultIpSdgTargetRepository>;
  const mockInitiativeBudgetRepo = {
    save: jest.fn(),
  } as any as jest.Mocked<ResultInitiativeBudgetRepository>;
  const mockUnitTimeRepo = {} as any as jest.Mocked<UnitTimeRepository>;
  const mockTocResultsRepo = {} as any as jest.Mocked<TocResultsRepository>;
  const mockYearRepository = {
    findOne: jest.fn(),
  } as any as jest.Mocked<YearRepository>;
  const mockLinkedRepo = {} as any as jest.Mocked<LinkedResultRepository>;
  const mockEvidenceRepo = {} as any as jest.Mocked<EvidencesRepository>;
  const mockIpsrService = {} as any as jest.Mocked<IpsrService>;
  const mockRoleByUserRepo = {} as any as jest.Mocked<RoleByUserRepository>;
  const mockDiscontinuedRepo = {
    inactiveData: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
  } as any as jest.Mocked<ResultsInvestmentDiscontinuedOptionRepository>;
  const mockVersioningService = {
    $_findActivePhase: jest.fn(),
  } as any as jest.Mocked<VersioningService>;
  const mockResultCountrySubnationalRepository = {
    find: jest.fn(),
    save: jest.fn(),
  } as any as jest.Mocked<ResultCountrySubnationalRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultInnovationPackageService,
        HandlersError,
        ReturnResponse,
        { provide: ResultRepository, useValue: mockResultRepository },
        { provide: VersionsService, useValue: mockVersionsService },
        { provide: RoleByUserRepository, useValue: mockRoleByUserRepo },
        {
          provide: ResultByInitiativesRepository,
          useValue: mockResultByInitiativeRepository,
        },
        { provide: ResultRegionRepository, useValue: mockRegionRepository },
        { provide: ResultCountryRepository, useValue: mockCountryRepository },
        { provide: IpsrRepository, useValue: mockIpsrRepository },
        {
          provide: ResultInnovationPackageRepository,
          useValue: mockRIPRepository,
        },
        { provide: ResultIpAAOutcomeRepository, useValue: mockIpAARepo },
        {
          provide: ClarisaActionAreaOutcomeRepository,
          useValue: mockClarisaAARepo,
        },
        {
          provide: ResultsImpactAreaIndicatorRepository,
          useValue: mockImpactIndicatorRepo,
        },
        { provide: ResultIpImpactAreaRepository, useValue: mockImpactAreaRepo },
        {
          provide: ActiveBackstoppingRepository,
          useValue: mockActiveBackstoppingRepo,
        },
        {
          provide: consensusInitiativeWorkPackageRepository,
          useValue: mockConsensusWPRepo,
        },
        {
          provide: RegionalIntegratedRepository,
          useValue: mockRegionalIntegratedRepo,
        },
        {
          provide: RegionalLeadershipRepository,
          useValue: mockRegionalLeadershipRepo,
        },
        {
          provide: RelevantCountryRepository,
          useValue: mockRelevantCountryRepo,
        },
        { provide: ResultByEvidencesRepository, useValue: mockByEvidencesRepo },
        { provide: ResultByIntitutionsRepository, useValue: mockByInstRepo },
        {
          provide: ResultByIntitutionsTypeRepository,
          useValue: mockByInstTypeRepo,
        },
        { provide: resultValidationRepository, useValue: mockValidationRepo },
        { provide: ResultIpSdgTargetRepository, useValue: mockSdgRepo },
        {
          provide: ResultInitiativeBudgetRepository,
          useValue: mockInitiativeBudgetRepo,
        },
        { provide: UnitTimeRepository, useValue: mockUnitTimeRepo },
        { provide: TocResultsRepository, useValue: mockTocResultsRepo },
        { provide: YearRepository, useValue: mockYearRepository },
        { provide: LinkedResultRepository, useValue: mockLinkedRepo },
        { provide: EvidencesRepository, useValue: mockEvidenceRepo },
        { provide: IpsrService, useValue: mockIpsrService },
        {
          provide: ResultsInvestmentDiscontinuedOptionRepository,
          useValue: mockDiscontinuedRepo,
        },
        { provide: VersioningService, useValue: mockVersioningService },
        {
          provide: ResultCountrySubnationalRepository,
          useValue: mockResultCountrySubnationalRepository,
        },
      ],
    }).compile();

    service = module.get(ResultInnovationPackageService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('createInnovationTitle formats countries and trims dot', () => {
    const result = { title: 'Core.' } as any;
    const countries = [{ name: 'A' }, { name: 'B' }];
    const s = service.createInnovationTitle(result, countries as any);
    expect(s).toContain('in A and B');
    expect(result.title.endsWith('.')).toBe(false);
  });

  it('findRegionalIntegrated returns OK', async () => {
    (mockRegionalIntegratedRepo.find as jest.Mock).mockResolvedValueOnce([
      { id: 1 },
    ]);
    const res = await service.findRegionalIntegrated();
    expect(res.status).toBe(HttpStatus.OK);
    expect(res.response).toEqual([{ id: 1 }]);
  });

  describe('createHeader validations', () => {
    const user = { id: 1 } as any;
    const dtoBase: any = {
      result_id: 2,
      initiative_id: 3,
      geo_scope_id: 2,
      regions: [{ id: 1, name: 'X' }],
      countries: [],
    };

    it('returns not found when core result missing', async () => {
      (mockResultRepository.getResultById as jest.Mock).mockResolvedValueOnce(
        null,
      );
      const res = await service.createHeader(dtoBase, user);
      expect(res.status).toBe(HttpStatus.NOT_FOUND);
      expect(res.message).toBe('The result was not found');
    });

    it('returns bad request when initiative is not mapped to core', async () => {
      (mockResultRepository.getResultById as jest.Mock).mockResolvedValueOnce({
        id: '2',
        result_type_id: 7,
        title: 'Core.',
        description: '',
      });
      (
        mockResultByInitiativeRepository.findOne as jest.Mock
      ).mockResolvedValueOnce({});
      (
        mockResultByInitiativeRepository.InitiativeByResult as jest.Mock
      ).mockResolvedValueOnce([{ inititiative_id: 99 }]);
      const res = await service.createHeader(dtoBase, user);
      expect(res.status).toBe(HttpStatus.BAD_REQUEST);
      expect(res.message).toContain('cannot create an Innovatio Package');
    });

    it('returns bad request when initiative_id missing', async () => {
      (mockResultRepository.getResultById as jest.Mock).mockResolvedValueOnce({
        id: '2',
        result_type_id: 7,
        title: 'Core.',
        description: '',
      });
      (
        mockResultByInitiativeRepository.findOne as jest.Mock
      ).mockResolvedValueOnce({});
      (
        mockResultByInitiativeRepository.InitiativeByResult as jest.Mock
      ).mockResolvedValueOnce([{ inititiative_id: 3 }]);
      const res = await service.createHeader(
        { ...dtoBase, initiative_id: null },
        user,
      );
      expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    });

    it('returns bad request when geo_scope_id missing', async () => {
      (mockResultRepository.getResultById as jest.Mock).mockResolvedValueOnce({
        id: '2',
        result_type_id: 7,
        title: 'Core.',
        description: '',
      });
      (
        mockResultByInitiativeRepository.findOne as jest.Mock
      ).mockResolvedValueOnce({});
      (
        mockResultByInitiativeRepository.InitiativeByResult as jest.Mock
      ).mockResolvedValueOnce([{ inititiative_id: 3 }]);
      const res = await service.createHeader(
        { ...dtoBase, geo_scope_id: null },
        user,
      );
      expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    });

    it('returns bad request when result type is not innovation development', async () => {
      (mockResultRepository.getResultById as jest.Mock).mockResolvedValueOnce({
        id: '2',
        result_type_id: 6,
        title: 'Core.',
        description: '',
      });
      (
        mockResultByInitiativeRepository.findOne as jest.Mock
      ).mockResolvedValueOnce({});
      (
        mockResultByInitiativeRepository.InitiativeByResult as jest.Mock
      ).mockResolvedValueOnce([{ inititiative_id: 3 }]);
      const res = await service.createHeader(dtoBase, user);
      expect(res.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('returns bad request when title already exists', async () => {
      (mockResultRepository.getResultById as jest.Mock).mockResolvedValue({
        id: '2',
        result_type_id: 7,
        title: 'Core.',
        description: '',
      });
      (mockResultByInitiativeRepository.findOne as jest.Mock).mockResolvedValue(
        {},
      );
      (
        mockResultByInitiativeRepository.InitiativeByResult as jest.Mock
      ).mockResolvedValue([{ inititiative_id: 3 }]);
      (mockVersioningService.$_findActivePhase as jest.Mock).mockResolvedValue({
        id: 1,
      });
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ id: 10, result_code: 101 }]),
      };
      (mockResultRepository.createQueryBuilder as jest.Mock).mockReturnValue(
        qb as any,
      );
      const res = await service.createHeader(dtoBase, user);
      expect(res.status).toBe(HttpStatus.BAD_REQUEST);
      expect(res.message).toContain('title already exists');
    });

    it('returns not found when active year missing', async () => {
      (mockResultRepository.getResultById as jest.Mock).mockResolvedValue({
        id: '2',
        result_type_id: 7,
        title: 'Core.',
        description: '',
      });
      (mockResultByInitiativeRepository.findOne as jest.Mock).mockResolvedValue(
        {},
      );
      (
        mockResultByInitiativeRepository.InitiativeByResult as jest.Mock
      ).mockResolvedValue([{ inititiative_id: 3 }]);
      (mockVersioningService.$_findActivePhase as jest.Mock).mockResolvedValue({
        id: 1,
      });
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      (mockResultRepository.createQueryBuilder as jest.Mock).mockReturnValue(
        qb as any,
      );
      (mockYearRepository.findOne as jest.Mock).mockResolvedValue(null);
      const res = await service.createHeader(dtoBase, user);
      expect(res.status).toBe(HttpStatus.NOT_FOUND);
      expect(res.message).toBe('Active year Not Found');
    });

    it('creates header successfully', async () => {
      (mockResultRepository.getResultById as jest.Mock).mockResolvedValue({
        id: '2',
        result_type_id: 7,
        title: 'Core.',
        description: '',
        gender_tag_level_id: null,
        climate_change_tag_level_id: null,
        lead_contact_person: null,
      });
      (mockResultByInitiativeRepository.findOne as jest.Mock).mockResolvedValue(
        {},
      );
      (
        mockResultByInitiativeRepository.InitiativeByResult as jest.Mock
      ).mockResolvedValue([{ inititiative_id: 3 }]);
      (mockVersioningService.$_findActivePhase as jest.Mock).mockResolvedValue({
        id: 1,
      });
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      (mockResultRepository.createQueryBuilder as jest.Mock).mockReturnValue(
        qb as any,
      );
      (mockYearRepository.findOne as jest.Mock).mockResolvedValue({
        year: 2024,
      });
      (mockResultRepository.getLastResultCode as jest.Mock).mockResolvedValue(
        1000,
      );
      (mockResultRepository.save as jest.Mock).mockResolvedValue({ id: 200 });
      (mockResultByInitiativeRepository.save as jest.Mock).mockResolvedValue({
        id: 300,
      });
      (mockInitiativeBudgetRepo.save as jest.Mock).mockResolvedValue({});
      (mockRIPRepository.save as jest.Mock).mockResolvedValue({});
      (mockIpsrRepository.save as jest.Mock).mockResolvedValue({
        result_by_innovation_package_id: 400,
      });
      (mockIpAARepo.mapActionAreaOutcome as jest.Mock).mockResolvedValue([]);
      (mockClarisaAARepo.find as jest.Mock).mockResolvedValue([]);
      (
        mockImpactIndicatorRepo.mapImpactAreaOutcomeToc as jest.Mock
      ).mockResolvedValue([]);
      (mockSdgRepo.mapSdgsToc as jest.Mock).mockResolvedValue([]);

      const res = await service.createHeader(dtoBase, user);
      expect(res.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResultRepository.save).toHaveBeenCalled();
      expect(mockRIPRepository.save).toHaveBeenCalled();
    });
  });

  describe('defaultRelevantCountry', () => {
    it('returns 3 for geoscopes 1/2', async () => {
      expect(await service.defaultRelevantCountry(1, 10)).toBe(3);
      expect(await service.defaultRelevantCountry(2, 10)).toBe(3);
    });
    it('returns 3 when geoscope 3/4 and country exists', async () => {
      (mockCountryRepository.findOne as jest.Mock).mockResolvedValueOnce({
        id: 1,
      });
      expect(await service.defaultRelevantCountry(3, 10)).toBe(3);
    });
    it('returns null otherwise', async () => {
      (mockCountryRepository.findOne as jest.Mock).mockResolvedValueOnce(null);
      expect(await service.defaultRelevantCountry(3, 10)).toBeNull();
      expect(await service.defaultRelevantCountry(5, 10)).toBeNull();
    });
  });
});
