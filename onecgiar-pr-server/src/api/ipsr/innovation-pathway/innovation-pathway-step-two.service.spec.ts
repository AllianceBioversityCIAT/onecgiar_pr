import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';

import { InnovationPathwayStepTwoService } from './innovation-pathway-step-two.service';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';
import { ResultRepository } from '../../results/result.repository';
import { ResultRegionRepository } from '../../results/result-regions/result-regions.repository';
import { ResultCountryRepository } from '../../results/result-countries/result-countries.repository';
import { InnovationPackagingExpertRepository } from '../innovation-packaging-experts/repositories/innovation-packaging-expert.repository';
import { ExpertisesRepository } from '../innovation-packaging-experts/repositories/expertises.repository';
import { ResultInnovationPackageRepository } from '../result-innovation-package/repositories/result-innovation-package.repository';
import { VersionsService } from '../../results/versions/versions.service';
import { IpsrRepository } from '../ipsr.repository';
import { ResultByIntitutionsRepository } from '../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultByInstitutionsByDeliveriesTypeRepository } from '../../results/result-by-institutions-by-deliveries-type/result-by-institutions-by-deliveries-type.repository';
import { ResultIpEoiOutcomeRepository } from './repository/result-ip-eoi-outcomes.repository';
import { ResultIpAAOutcomeRepository } from './repository/result-ip-action-area-outcome.repository';
import { ResultIpSdgTargetRepository } from './repository/result-ip-sdg-targets.repository';
import { ResultActorRepository } from '../../results/result-actors/repositories/result-actors.repository';
import { ResultByIntitutionsTypeRepository } from '../../results/results_by_institution_types/result_by_intitutions_type.repository';
import { ResultIpMeasureRepository } from '../result-ip-measures/result-ip-measures.repository';
import { ResultIpImpactAreaRepository } from './repository/result-ip-impact-area-targets.repository';
import { EvidencesRepository } from '../../../api/results/evidences/evidences.repository';
import { YearRepository } from '../../../api/results/years/year.repository';
import { ResultByInitiativesRepository } from 'src/api/results/results_by_inititiatives/resultByInitiatives.repository';
import { ComplementaryInnovationFunctionsRepository } from '../results-complementary-innovations-functions/repositories/complementary-innovation-functions.repository';
import { VersioningService } from '../../versioning/versioning.service';
import { ResultsComplementaryInnovationRepository } from '../results-complementary-innovations/repositories/results-complementary-innovation.repository';
import { ResultsComplementaryInnovationsFunctionRepository } from '../results-complementary-innovations-functions/repositories/results-complementary-innovations-function.repository';

describe('InnovationPathwayStepTwoService', () => {
  let service: InnovationPathwayStepTwoService;

  const repo = () => ({
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    findBy: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    getResultByTypes: jest.fn(),
  });

  const mockResultRepository = {
    ...repo(),
    getLastResultCode: jest.fn(),
  } as any as jest.Mocked<ResultRepository>;
  const mockRegionRepository =
    repo() as any as jest.Mocked<ResultRegionRepository>;
  const mockCountryRepository =
    repo() as any as jest.Mocked<ResultCountryRepository>;
  const mockInnovationPackagingExpertRepository =
    repo() as any as jest.Mocked<InnovationPackagingExpertRepository>;
  const mockExpertisesRepository =
    repo() as any as jest.Mocked<ExpertisesRepository>;
  const mockResultInnovationPackageRepository =
    repo() as any as jest.Mocked<ResultInnovationPackageRepository>;
  const mockVersionsService = {
    $_findActivePhase: jest.fn(),
  } as any as jest.Mocked<VersionsService>;
  const mockIpsrRepository = {
    findOneBy: jest.fn(),
    getStepTwoOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  } as any as jest.Mocked<IpsrRepository>;
  const mockRbiRepository =
    repo() as any as jest.Mocked<ResultByIntitutionsRepository>;
  const mockDeliveriesTypeRepository = {
    getDeliveryByResultByInstitution: jest.fn(),
  } as any as jest.Mocked<ResultByInstitutionsByDeliveriesTypeRepository>;
  const mockEoiRepo =
    repo() as any as jest.Mocked<ResultIpEoiOutcomeRepository>;
  const mockAaRepo = repo() as any as jest.Mocked<ResultIpAAOutcomeRepository>;
  const mockSdgRepo = repo() as any as jest.Mocked<ResultIpSdgTargetRepository>;
  const mockActorRepo = repo() as any as jest.Mocked<ResultActorRepository>;
  const mockInstTypeRepo =
    repo() as any as jest.Mocked<ResultByIntitutionsTypeRepository>;
  const mockMeasureRepo =
    repo() as any as jest.Mocked<ResultIpMeasureRepository>;
  const mockImpactAreaRepo =
    repo() as any as jest.Mocked<ResultIpImpactAreaRepository>;
  const mockEvidenceRepo = repo() as any as jest.Mocked<EvidencesRepository>;
  const mockYearRepository = {
    findOne: jest.fn(),
  } as any as jest.Mocked<YearRepository>;
  const mockRbiInitRepository = {
    getOwnerInitiativeByResult: jest.fn(),
    save: jest.fn(),
  } as any as jest.Mocked<ResultByInitiativesRepository>;
  const mockCompFuncRepo = {
    find: jest.fn(),
  } as any as jest.Mocked<ComplementaryInnovationFunctionsRepository>;
  const mockVersioningService = {
    $_findActivePhase: jest.fn(),
  } as any as jest.Mocked<VersioningService>;
  const mockResultsComplementaryInnovationRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  } as any as jest.Mocked<ResultsComplementaryInnovationRepository>;
  const mockResultsComplementaryInnovationsFunctionRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  } as any as jest.Mocked<ResultsComplementaryInnovationsFunctionRepository>;

  const providers = [
    InnovationPathwayStepTwoService,
    HandlersError,
    ReturnResponse,
    { provide: ResultRepository, useValue: mockResultRepository },
    { provide: ResultRegionRepository, useValue: mockRegionRepository },
    { provide: ResultCountryRepository, useValue: mockCountryRepository },
    {
      provide: InnovationPackagingExpertRepository,
      useValue: mockInnovationPackagingExpertRepository,
    },
    { provide: ExpertisesRepository, useValue: mockExpertisesRepository },
    {
      provide: ResultInnovationPackageRepository,
      useValue: mockResultInnovationPackageRepository,
    },
    { provide: VersionsService, useValue: mockVersionsService },
    { provide: IpsrRepository, useValue: mockIpsrRepository },
    { provide: ResultByIntitutionsRepository, useValue: mockRbiRepository },
    {
      provide: ResultByInstitutionsByDeliveriesTypeRepository,
      useValue: mockDeliveriesTypeRepository,
    },
    { provide: ResultIpEoiOutcomeRepository, useValue: mockEoiRepo },
    { provide: ResultIpAAOutcomeRepository, useValue: mockAaRepo },
    { provide: ResultIpSdgTargetRepository, useValue: mockSdgRepo },
    { provide: ResultActorRepository, useValue: mockActorRepo },
    { provide: ResultByIntitutionsTypeRepository, useValue: mockInstTypeRepo },
    { provide: ResultIpMeasureRepository, useValue: mockMeasureRepo },
    { provide: ResultIpImpactAreaRepository, useValue: mockImpactAreaRepo },
    { provide: EvidencesRepository, useValue: mockEvidenceRepo },
    { provide: YearRepository, useValue: mockYearRepository },
    { provide: ResultByInitiativesRepository, useValue: mockRbiInitRepository },
    {
      provide: ComplementaryInnovationFunctionsRepository,
      useValue: mockCompFuncRepo,
    },
    { provide: VersioningService, useValue: mockVersioningService },
    {
      provide: ResultsComplementaryInnovationRepository,
      useValue: mockResultsComplementaryInnovationRepository,
    },
    {
      provide: ResultsComplementaryInnovationsFunctionRepository,
      useValue: mockResultsComplementaryInnovationsFunctionRepository,
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers,
    }).compile();
    service = module.get(InnovationPathwayStepTwoService);
    jest.clearAllMocks();
  });

  it('findInnovationsAndComplementary returns OK', async () => {
    (mockResultRepository.getResultByTypes as jest.Mock).mockResolvedValueOnce([
      { id: 1 },
    ]);
    const res = await service.findInnovationsAndComplementary();
    expect(res.status).toBe(HttpStatus.OK);
    expect(mockResultRepository.getResultByTypes).toHaveBeenCalledWith([7, 11]);
  });

  it('getStepTwoOne returns complementary innovations', async () => {
    (mockResultRepository.findOne as jest.Mock).mockResolvedValueOnce({
      id: 9,
      is_active: true,
    });
    (mockIpsrRepository.getStepTwoOne as jest.Mock).mockResolvedValueOnce([
      { id: 100 },
    ]);
    const res = await service.getStepTwoOne(9);
    expect(res.status).toBe(HttpStatus.OK);
    expect(res.response).toEqual([{ id: 100 }]);
  });

  it('saveSetepTowOne saves/activates/inactivates accordingly', async () => {
    (mockResultRepository.findOne as jest.Mock).mockResolvedValueOnce({
      id: 10,
      is_active: true,
    });
    (
      mockVersioningService.$_findActivePhase as jest.Mock
    ).mockResolvedValueOnce({ id: 1 });
    (mockIpsrRepository.find as jest.Mock).mockResolvedValueOnce([
      { result_id: 2, is_active: true },
      { result_id: 3, is_active: false },
    ]);
    (mockIpsrRepository.save as jest.Mock).mockResolvedValue(undefined);
    const payload = [{ result_id: 3 }, { result_id: 4 }] as any;
    const res = await service.saveSetepTowOne(
      10,
      { id: 1 } as any,
      payload as any,
    );
    expect(res.status).toBe(HttpStatus.OK);
    // Should save new (4), activate (3), and inactivate (2)
    expect((mockIpsrRepository.save as jest.Mock).mock.calls.length).toBe(3);
  });

  it('findComplementaryInnovationFuctions returns OK', async () => {
    (mockCompFuncRepo.find as jest.Mock).mockResolvedValueOnce([{ id: 1 }]);
    const res = await service.findComplementaryInnovationFuctions();
    expect(res.status).toBe(HttpStatus.OK);
    expect(res.response).toEqual([{ id: 1 }]);
  });

  describe('saveComplementaryInnovation', () => {
    const user = { id: 5 } as any;

    it('validates required title and short_title', async () => {
      (mockResultRepository.findBy as jest.Mock).mockResolvedValueOnce([
        { id: 1 },
      ]);
      (
        mockRbiInitRepository.getOwnerInitiativeByResult as jest.Mock
      ).mockResolvedValueOnce({});
      (mockYearRepository.findOne as jest.Mock).mockResolvedValueOnce({
        active: true,
        year: 2024,
      });
      (
        mockVersioningService.$_findActivePhase as jest.Mock
      ).mockResolvedValueOnce({ id: 1 });
      const res = await service.saveComplementaryInnovation(1, user, {
        title: '',
        short_title: '',
      } as any);
      expect(res.status).toBe(HttpStatus.NOT_FOUND);
      expect(res.message).toContain('Title and Short Title');
    });

    it('persists complementary innovation and functions', async () => {
      (mockResultRepository.findBy as jest.Mock).mockResolvedValueOnce([
        { id: 100 },
      ]);
      (
        mockRbiInitRepository.getOwnerInitiativeByResult as jest.Mock
      ).mockResolvedValueOnce({});
      (mockYearRepository.findOne as jest.Mock).mockResolvedValueOnce({
        active: true,
        year: 2024,
      });
      (
        mockVersioningService.$_findActivePhase as jest.Mock
      ).mockResolvedValueOnce({ id: 1 });
      (
        mockResultRepository.getLastResultCode as jest.Mock
      ).mockResolvedValueOnce(1000);
      (mockResultRepository.save as jest.Mock).mockResolvedValueOnce({
        id: 200,
      });
      (
        mockResultInnovationPackageRepository.save as jest.Mock
      ).mockResolvedValueOnce({});
      const saveCI = {
        save: jest
          .fn()
          .mockResolvedValue({ result_complementary_innovation_id: 10 }),
      };
      (service as any)._resultComplementaryInnovation = saveCI;
      const saveCIFunctions = { save: jest.fn().mockResolvedValue({}) };
      (service as any)._resultComplementaryInnovationFunctions =
        saveCIFunctions;

      const res = await service.saveComplementaryInnovation(100, user, {
        title: 'T',
        short_title: 'S',
        initiative_id: 1,
        projects_organizations_working_on_innovation: true,
        complementaryFunctions: [{ complementary_innovation_functions_id: 3 }],
      } as any);
      expect(res.status).toBe(HttpStatus.OK);
      expect(saveCI.save).toHaveBeenCalled();
      expect(saveCIFunctions.save).toHaveBeenCalled();
    });
  });

  describe('getComplementaryInnovationById', () => {
    it('not found result returns 404', async () => {
      (mockResultRepository.findOneBy as jest.Mock).mockResolvedValueOnce(null);
      const res = await service.getComplementaryInnovationById(1);
      expect(res.status).toBe(HttpStatus.NOT_FOUND);
    });
  });

  describe('updateComplementaryInnovation', () => {
    const user = { id: 5 } as any;

    it('returns not found when complementary innovation missing', async () => {
      (
        mockVersioningService.$_findActivePhase as jest.Mock
      ).mockResolvedValueOnce({ id: 1 });
      (mockResultRepository.findOneBy as jest.Mock).mockResolvedValueOnce({
        id: 1,
      });
      const ci = { findOne: jest.fn().mockResolvedValue(null) };
      (service as any)._resultComplementaryInnovation = ci;
      const res = await service.updateComplementaryInnovation(
        1,
        user,
        {} as any,
      );
      expect(res.status).toBe(HttpStatus.NOT_FOUND);
    });
  });

  describe('inactiveComplementaryInnovation', () => {
    const user = { id: 9 } as any;
    it('returns not found when result missing', async () => {
      (mockResultRepository.findOneBy as jest.Mock).mockResolvedValueOnce(null);
      const res = await service.inactiveComplementaryInnovation(1, user);
      expect(res.status).toBe(HttpStatus.NOT_FOUND);
    });

    it('inactivates result and relations', async () => {
      (mockResultRepository.findOneBy as jest.Mock).mockResolvedValueOnce({
        id: 1,
        is_active: true,
      });
      (mockIpsrRepository.find as jest.Mock).mockResolvedValueOnce([
        { result_by_innovation_package_id: 2 },
      ]);
      const ci = {
        findOne: jest
          .fn()
          .mockResolvedValue({ result_complementary_innovation_id: 7 }),
      };
      (service as any)._resultComplementaryInnovation = ci;
      (mockResultRepository.update as jest.Mock).mockResolvedValueOnce(
        undefined,
      );
      (mockIpsrRepository.update as jest.Mock).mockResolvedValueOnce(undefined);
      const res = await service.inactiveComplementaryInnovation(1, user);
      expect(res.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });
});
