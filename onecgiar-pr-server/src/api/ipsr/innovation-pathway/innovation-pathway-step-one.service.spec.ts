import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';

import { InnovationPathwayStepOneService } from './innovation-pathway-step-one.service';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';
import { ResultRepository } from '../../results/result.repository';
import { ResultRegionRepository } from '../../results/result-regions/result-regions.repository';
import { ResultCountryRepository } from '../../results/result-countries/result-countries.repository';
import { InnovationPackagingExpertRepository } from '../innovation-packaging-experts/repositories/innovation-packaging-expert.repository';
import { ExpertisesRepository } from '../innovation-packaging-experts/repositories/expertises.repository';
import { VersionsService } from '../../results/versions/versions.service';
import { ResultInnovationPackageRepository } from '../result-innovation-package/repositories/result-innovation-package.repository';
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
import { ClarisaInstitutionsTypeRepository } from '../../../clarisa/clarisa-institutions-type/ClariasaInstitutionsType.repository';
import { ResultByInitiativesRepository } from '../../results/results_by_inititiatives/resultByInitiatives.repository';
import { ClarisaInstitutionsRepository } from '../../../clarisa/clarisa-institutions/ClariasaInstitutions.repository';
import { ResultIpExpertisesRepository } from '../innovation-packaging-experts/repositories/result-ip-expertises.repository';
import { VersioningService } from '../../versioning/versioning.service';
import { ResultCountrySubnationalRepository } from '../../results/result-countries-sub-national/repositories/result-country-subnational.repository';
import { ResultInnovationPackageService } from '../result-innovation-package/result-innovation-package.service';
import { InnovationPathwayStepThreeService } from './innovation-pathway-step-three.service';
import { ResultIpExpertWorkshopOrganizedRepostory } from './repository/result-ip-expert-workshop-organized.repository';
import { EvidencesRepository } from '../../results/evidences/evidences.repository';

describe('InnovationPathwayStepOneService', () => {
  let service: InnovationPathwayStepOneService;

  const repo = () => ({
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    getResultRegionByResultId: jest.fn(),
    getResultCountriesByResultId: jest.fn(),
  });

  const mockResultRepository = repo() as any as jest.Mocked<ResultRepository>;
  const mockRegionRepository =
    repo() as any as jest.Mocked<ResultRegionRepository>;
  const mockCountryRepository =
    repo() as any as jest.Mocked<ResultCountryRepository>;
  const mockInnovationPackagingExpertRepository =
    repo() as any as jest.Mocked<InnovationPackagingExpertRepository>;
  const mockExpertisesRepository =
    repo() as any as jest.Mocked<ExpertisesRepository>;
  const mockVersionsService = {
    $_findActivePhase: jest.fn(),
  } as any as jest.Mocked<VersionsService>;
  const mockResultInnovationPackageRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
  } as any as jest.Mocked<ResultInnovationPackageRepository>;
  const mockIpsrRepository = {
    findOneBy: jest.fn(),
    getInnovationCoreStepOne: jest.fn(),
    findOne: jest.fn(),
  } as any as jest.Mocked<IpsrRepository>;
  const mockRbiRepository =
    repo() as any as jest.Mocked<ResultByIntitutionsRepository>;
  const mockDeliveriesTypeRepository = {
    getDeliveryByResultByInstitution: jest.fn(),
  } as any as jest.Mocked<ResultByInstitutionsByDeliveriesTypeRepository>;
  const mockEoiRepo = {
    getEoiOutcomes: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    find: jest.fn(),
  } as any as jest.Mocked<ResultIpEoiOutcomeRepository>;
  const mockAaRepo = {
    find: jest.fn(),
    update: jest.fn(),
    retrieveAaOutcomes: jest.fn(),
  } as any as jest.Mocked<ResultIpAAOutcomeRepository>;
  const mockSdgRepo = repo() as any as jest.Mocked<ResultIpSdgTargetRepository>;
  const mockActorRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
  } as any as jest.Mocked<ResultActorRepository>;
  const mockInstTypeRepo = {
    find: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    getNewResultByInstitutionTypeExists: jest.fn(),
    getNewResultByIdExists: jest.fn(),
  } as any as jest.Mocked<ResultByIntitutionsTypeRepository>;
  const mockMeasureRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
  } as any as jest.Mocked<ResultIpMeasureRepository>;
  const mockImpactAreaRepo =
    repo() as any as jest.Mocked<ResultIpImpactAreaRepository>;
  const mockClarisaTypeRepo =
    repo() as any as jest.Mocked<ClarisaInstitutionsTypeRepository>;
  const mockRbiInitRepo = {
    findOne: jest.fn(),
  } as any as jest.Mocked<ResultByInitiativesRepository>;
  const mockClarisaInstRepo =
    repo() as any as jest.Mocked<ClarisaInstitutionsRepository>;
  const mockResultIpExpertisesRepository =
    repo() as any as jest.Mocked<ResultIpExpertisesRepository>;
  const mockVersioningService = {
    $_findActivePhase: jest.fn(),
  } as any as jest.Mocked<VersioningService>;
  const mockSubnationalRepo = {
    find: jest.fn(),
  } as any as jest.Mocked<ResultCountrySubnationalRepository>;
  const mockResultInnovationPackageService = {
    saveSubNational: jest.fn(),
  } as any as jest.Mocked<ResultInnovationPackageService>;
  const mockStepThreeService = {
    saveinnovationWorkshop: jest.fn(),
    saveWorkshop: jest.fn(),
  } as any as jest.Mocked<InnovationPathwayStepThreeService>;
  const mockWorkshopRepo = {
    find: jest.fn(),
  } as any as jest.Mocked<ResultIpExpertWorkshopOrganizedRepostory>;
  const mockEvidenceRepo = {
    findOne: jest.fn(),
  } as any as jest.Mocked<EvidencesRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InnovationPathwayStepOneService,
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
        { provide: VersionsService, useValue: mockVersionsService },
        {
          provide: ResultInnovationPackageRepository,
          useValue: mockResultInnovationPackageRepository,
        },
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
        {
          provide: ResultByIntitutionsTypeRepository,
          useValue: mockInstTypeRepo,
        },
        { provide: ResultIpMeasureRepository, useValue: mockMeasureRepo },
        { provide: ResultIpImpactAreaRepository, useValue: mockImpactAreaRepo },
        {
          provide: ClarisaInstitutionsTypeRepository,
          useValue: mockClarisaTypeRepo,
        },
        { provide: ResultByInitiativesRepository, useValue: mockRbiInitRepo },
        {
          provide: ClarisaInstitutionsRepository,
          useValue: mockClarisaInstRepo,
        },
        {
          provide: ResultIpExpertisesRepository,
          useValue: mockResultIpExpertisesRepository,
        },
        { provide: VersioningService, useValue: mockVersioningService },
        {
          provide: ResultCountrySubnationalRepository,
          useValue: mockSubnationalRepo,
        },
        {
          provide: ResultInnovationPackageService,
          useValue: mockResultInnovationPackageService,
        },
        {
          provide: InnovationPathwayStepThreeService,
          useValue: mockStepThreeService,
        },
        {
          provide: ResultIpExpertWorkshopOrganizedRepostory,
          useValue: mockWorkshopRepo,
        },
        { provide: EvidencesRepository, useValue: mockEvidenceRepo },
      ],
    }).compile();

    service = module.get(InnovationPathwayStepOneService);
    jest.clearAllMocks();
  });

  describe('utility string methods', () => {
    it('arrayToStringAnd formats list with and', () => {
      const a = ['A', 'B', 'C'];
      const res = (service as any).arrayToStringAnd([...a]);
      expect(res.trim()).toBe('A, B and C');
      const empty = (service as any).arrayToStringAnd([]);
      expect(empty).toBe(' <Data not provided>');
    });

    it('arrayToStringGeoScopeAnd returns expected per scope', () => {
      const regions = [{ name: 'R1' }, { name: 'R2' }] as any;
      const countries = [{ name: 'C1' }, { name: 'C2' }] as any;
      expect(
        (service as any).arrayToStringGeoScopeAnd(1, [], []),
      ).toBeUndefined();
      expect(
        (service as any).arrayToStringGeoScopeAnd(2, regions, []),
      ).toContain('R1');
      expect(
        (service as any).arrayToStringGeoScopeAnd(3, [], countries),
      ).toContain('C1');
      expect((service as any).arrayToStringGeoScopeAnd(5, [], [])).toBe(
        ' <Data not provided>',
      );
    });

    it('arrayOrganizationToString formats institutions', () => {
      const orgs = [
        { how_many: 2, obj_institution_types: { name: 'TypeA' } },
        { how_many: 1, obj_institution_types: { name: 'TypeB' } },
      ] as any;
      const res = (service as any).arrayOrganizationToString([...orgs]);
      expect(res).toContain('2 TypeA');
      expect(res).toContain('and 1 TypeB');
    });

    it('arrayMeasureToString formats measures', () => {
      const ms = [
        { quantity: 10, unit_of_measure: 'kg' },
        { quantity: 5, unit_of_measure: 'm' },
      ] as any;
      const res = (service as any).arrayMeasureToString([...ms]);
      expect(res).toContain('10 kg');
      expect(res).toContain('and 5 m');
    });

    it('arrayToStringActorsAnd formats actors', () => {
      const actors = [
        {
          women: 10,
          women_youth: 4,
          men: 12,
          men_youth: 5,
          sex_and_age_disaggregation: false,
          obj_actor_type: { actor_type_id: 1, name: 'Farmers' },
        },
        {
          how_many: 7,
          sex_and_age_disaggregation: true,
          obj_actor_type: { actor_type_id: 5 },
          other_actor_type: 'Other',
        },
      ] as any;
      const res = (service as any).arrayToStringActorsAnd([...actors]);
      expect(res).toContain(
        '10 women (4 youth / 6 non-youth) & 12 men (5 youth / 7 non-youth) Farmers',
      );
      expect(res).toContain('and 7 Other');
    });

    it('isNullData maps undefined to null', () => {
      expect(service.isNullData(undefined)).toBeNull();
      expect(service.isNullData(0)).toBe(0);
    });
  });

  describe('saveGeoScope', () => {
    const user = { id: 1 } as any;
    const result = { id: 100, title: 'Core.' } as any;

    beforeEach(() => {
      (mockIpsrRepository.findOneBy as jest.Mock).mockResolvedValue({
        result_id: 200,
      });
      (mockResultRepository.findOne as jest.Mock).mockResolvedValue({
        id: 200,
        title: 'Core.',
      });
      (mockRegionRepository.update as jest.Mock).mockResolvedValue(undefined);
      (mockCountryRepository.find as jest.Mock).mockResolvedValue([]);
      (mockResultRepository.update as jest.Mock).mockResolvedValue(undefined);
      (mockRegionRepository.save as jest.Mock).mockResolvedValue(undefined);
    });

    it('handles region scope (2) and updates title', async () => {
      const dto = {
        geo_scope_id: 2,
        regions: [{ id: 1, name: 'Africa' }],
        countries: [],
      } as any;
      const res = await service.saveGeoScope(result, dto, user);
      expect(res.status).toBe(HttpStatus.OK);
      expect(mockResultRepository.update).toHaveBeenCalledWith(
        100,
        expect.objectContaining({ geographic_scope_id: 2 }),
      );
      // Ensure regions saved
      expect(mockRegionRepository.save).toHaveBeenCalled();
    });

    it('handles country scopes (3) and saves countries', async () => {
      (mockCountryRepository.save as jest.Mock).mockResolvedValue({
        result_country_id: 1,
      });
      const dto = {
        geo_scope_id: 3,
        regions: [],
        countries: [{ id: 5, name: 'Colombia' }],
      } as any;
      const res = await service.saveGeoScope(result, dto, user);
      expect(res.status).toBe(HttpStatus.OK);
      expect(mockCountryRepository.save).toHaveBeenCalledWith({
        result_id: 100,
        country_id: 5,
      });
    });
  });

  describe('retrieveAaOutcomes', () => {
    const user = { id: 1 } as any;

    it('returns not found when result does not exist', async () => {
      (mockResultRepository.findOne as jest.Mock).mockResolvedValueOnce(null);
      const res = await service.retrieveAaOutcomes(2, user);
      expect(res.status).toBe(HttpStatus.NOT_FOUND);
      expect(res.message).toBe('The result does not exist');
    });

    it('disables old AA outcomes and retrieves new ones', async () => {
      (mockResultRepository.findOne as jest.Mock).mockResolvedValueOnce({
        id: 2,
        is_active: true,
      });
      (
        mockResultInnovationPackageRepository.findOne as jest.Mock
      ).mockResolvedValueOnce({
        result_innovation_package_id: 2,
        is_active: true,
      });
      (mockIpsrRepository.findOne as jest.Mock).mockResolvedValueOnce({
        result_by_innovation_package_id: 20,
        result_id: 9,
      });
      (mockAaRepo.find as jest.Mock).mockResolvedValueOnce([
        { result_ip_action_area_outcome_id: 1 },
      ]);
      (mockRbiInitRepo.findOne as jest.Mock).mockResolvedValueOnce({
        result_id: 9,
        initiative_id: 77,
      });
      (mockAaRepo.retrieveAaOutcomes as jest.Mock).mockResolvedValueOnce([
        'ok',
      ]);

      const res = await service.retrieveAaOutcomes(2, user);
      expect(res.status).toBe(HttpStatus.OK);
      expect(mockAaRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ is_active: false }),
      );
      expect(res.response).toEqual(['ok']);
    });
  });

  describe('saveSpecifyAspiredOutcomesAndImpact', () => {
    const user = { id: 1 } as any;
    const result = { id: 50 } as any;

    it('creates and deactivates EOI outcomes as needed', async () => {
      (mockIpsrRepository.findOneBy as jest.Mock).mockResolvedValueOnce({
        result_by_innovation_package_id: 5,
      });
      // First eoi -> not exists -> save, second -> exists -> update
      (mockEoiRepo.findOne as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ result_ip_eoi_outcome_id: 22 });
      (mockEoiRepo.find as jest.Mock).mockResolvedValueOnce([
        { result_ip_eoi_outcome_id: 100, toc_result_id: 1 },
        { result_ip_eoi_outcome_id: 101, toc_result_id: 2 },
      ]);

      const dto = {
        eoiOutcomes: [{ toc_result_id: 2 }, { toc_result_id: 3 }],
      } as any;
      const res = await service.saveSpecifyAspiredOutcomesAndImpact(
        result,
        dto,
        user,
      );
      expect(res.status).toBe(HttpStatus.OK);
      expect(mockEoiRepo.save).toHaveBeenCalled();
      expect(mockEoiRepo.update).toHaveBeenCalledWith(22, expect.any(Object));
      // Deactivated the missing one (toc_result_id 1)
      expect(mockEoiRepo.update).toHaveBeenCalledWith(
        100,
        expect.objectContaining({ is_active: false }),
      );
    });
  });
});
