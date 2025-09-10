import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';

import { InnovationPathwayStepThreeService } from './innovation-pathway-step-three.service';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';
import { ResultRepository } from '../../results/result.repository';
import { ResultInnovationPackageRepository } from '../result-innovation-package/repositories/result-innovation-package.repository';
import { IpsrRepository } from '../ipsr.repository';
import { ResultByIntitutionsRepository } from '../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultIpSdgTargetRepository } from './repository/result-ip-sdg-targets.repository';
import { ResultsComplementaryInnovationRepository } from '../results-complementary-innovations/repositories/results-complementary-innovation.repository';
import { ResultsByIpInnovationUseMeasureRepository } from '../results-by-ip-innovation-use-measures/results-by-ip-innovation-use-measure.repository';
import { ResultsIpActorRepository } from '../results-ip-actors/results-ip-actor.repository';
import { ResultsIpInstitutionTypeRepository } from '../results-ip-institution-type/results-ip-institution-type.repository';
import { EvidencesRepository } from '../../results/evidences/evidences.repository';
import { ResultIpExpertWorkshopOrganizedRepostory } from './repository/result-ip-expert-workshop-organized.repository';
import { VersionsService } from '../../results/versions/versions.service';
import { VersioningService } from '../../versioning/versioning.service';

describe('InnovationPathwayStepThreeService', () => {
  let service: InnovationPathwayStepThreeService;

  const repo = () => ({
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
  });

  const mockResultRepository = repo() as any as jest.Mocked<ResultRepository>;
  const mockRIPRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
  } as any as jest.Mocked<ResultInnovationPackageRepository>;
  const mockIpsrRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
  } as any as jest.Mocked<IpsrRepository>;
  const mockRbiRepo =
    repo() as any as jest.Mocked<ResultByIntitutionsRepository>;
  const mockSdgRepo = repo() as any as jest.Mocked<ResultIpSdgTargetRepository>;
  const mockCompRepo =
    repo() as any as jest.Mocked<ResultsComplementaryInnovationRepository>;
  const mockUseMeasureRepo = {
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
  } as any as jest.Mocked<ResultsByIpInnovationUseMeasureRepository>;
  const mockActorRepo = {
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
  } as any as jest.Mocked<ResultsIpActorRepository>;
  const mockInstTypeRepo = {
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
  } as any as jest.Mocked<ResultsIpInstitutionTypeRepository>;
  const mockEvidenceRepo = {
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
  } as any as jest.Mocked<EvidencesRepository>;
  const mockWorkshopRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
  } as any as jest.Mocked<ResultIpExpertWorkshopOrganizedRepostory>;
  const mockVersionsService = {
    $_findActivePhase: jest.fn(),
  } as any as jest.Mocked<VersionsService>;
  const mockVersioningService = {
    $_findActivePhase: jest.fn(),
  } as any as jest.Mocked<VersioningService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InnovationPathwayStepThreeService,
        HandlersError,
        ReturnResponse,
        { provide: ResultRepository, useValue: mockResultRepository },
        {
          provide: ResultInnovationPackageRepository,
          useValue: mockRIPRepository,
        },
        { provide: IpsrRepository, useValue: mockIpsrRepository },
        { provide: ResultByIntitutionsRepository, useValue: mockRbiRepo },
        { provide: ResultIpSdgTargetRepository, useValue: mockSdgRepo },
        {
          provide: ResultsComplementaryInnovationRepository,
          useValue: mockCompRepo,
        },
        {
          provide: ResultsByIpInnovationUseMeasureRepository,
          useValue: mockUseMeasureRepo,
        },
        { provide: ResultsIpActorRepository, useValue: mockActorRepo },
        {
          provide: ResultsIpInstitutionTypeRepository,
          useValue: mockInstTypeRepo,
        },
        { provide: EvidencesRepository, useValue: mockEvidenceRepo },
        {
          provide: ResultIpExpertWorkshopOrganizedRepostory,
          useValue: mockWorkshopRepo,
        },
        { provide: VersionsService, useValue: mockVersionsService },
        { provide: VersioningService, useValue: mockVersioningService },
      ],
    }).compile();

    service = module.get(InnovationPathwayStepThreeService);
    jest.clearAllMocks();
  });

  describe('saveinnovationWorkshop', () => {
    const user = { id: 2 } as any;
    it('applies validData logic based on data_id', async () => {
      const rbi: any = {
        result_by_innovation_package_id: 7,
        potential_innovation_readiness_level: 10,
        potential_innovation_use_level: 20,
        current_innovation_readiness_level: 30,
        current_innovation_use_level: 40,
      };
      await (service as any).saveinnovationWorkshop(user, rbi, 1);
      expect(mockIpsrRepository.update).toHaveBeenCalledWith(
        7,
        expect.objectContaining({
          potential_innovation_readiness_level: null,
          potential_innovation_use_level: null,
          current_innovation_readiness_level: 30,
          current_innovation_use_level: 40,
        }),
      );
      await (service as any).saveinnovationWorkshop(user, rbi, 2);
      expect(mockIpsrRepository.update).toHaveBeenCalledWith(
        7,
        expect.objectContaining({
          potential_innovation_readiness_level: 10,
          potential_innovation_use_level: 20,
        }),
      );
    });
  });

  describe('saveWorkshop', () => {
    const user = { id: 3 } as any;
    it('deactivates when not organized', async () => {
      (mockEvidenceRepo.findOne as jest.Mock).mockResolvedValueOnce({ id: 1 });
      (mockWorkshopRepo.find as jest.Mock).mockResolvedValueOnce([
        { result_ip_expert_workshop_organized_id: 5 },
      ]);
      const res = await service.saveWorkshop(11, user, {
        result_ip: { is_expert_workshop_organized: false },
      } as any);
      expect(res.message).toBe(
        'The link workshop list have been inactive successfully',
      );
      expect(mockEvidenceRepo.update).toHaveBeenCalledWith(
        1,
        expect.any(Object),
      );
      expect(mockWorkshopRepo.update).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ is_active: false }),
      );
    });

    it('validates expert workshop item names', async () => {
      (mockEvidenceRepo.findOne as jest.Mock).mockResolvedValueOnce(null);
      const res = await service.saveWorkshop(11, user, {
        result_ip: { is_expert_workshop_organized: true },
        link_workshop_list: 'https://x',
        result_ip_expert_workshop_organized: [
          { first_name: '', last_name: '' },
        ],
      } as any);
      expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    });

    it('creates evidence and upserts workshops, deactivates missing', async () => {
      (mockEvidenceRepo.findOne as jest.Mock).mockResolvedValueOnce(null);
      (mockWorkshopRepo.findOne as jest.Mock).mockResolvedValueOnce(null);
      (mockWorkshopRepo.find as jest.Mock).mockResolvedValueOnce([
        {
          result_ip_expert_workshop_organized_id: 9,
          first_name: 'Old',
          last_name: 'Guy',
        },
      ]);
      const res = await service.saveWorkshop(11, user, {
        result_ip: { is_expert_workshop_organized: true },
        link_workshop_list: 'https://x',
        result_ip_expert_workshop_organized: [
          {
            first_name: 'New',
            last_name: 'Person',
            email: 'n@p',
            workshop_role: 'role',
          },
        ],
      } as any);
      expect((res as any).valid).toBe(true);
      expect(mockEvidenceRepo.save).toHaveBeenCalled();
      expect(mockWorkshopRepo.save).toHaveBeenCalled();
      expect(mockWorkshopRepo.update).toHaveBeenCalledWith(
        9,
        expect.objectContaining({ is_active: false }),
      );
    });
  });

  describe('getStepThree', () => {
    it('returns not found when result_ip missing', async () => {
      (mockRIPRepository.findOne as jest.Mock).mockResolvedValueOnce(null);
      const res = await service.getStepThree(1);
      expect(res.status).toBe(HttpStatus.NOT_FOUND);
    });
  });

  it('isNullData returns null for undefined and keeps others', () => {
    expect(service.isNullData(undefined)).toBeNull();
    expect(service.isNullData(0)).toBe(0);
  });
});
