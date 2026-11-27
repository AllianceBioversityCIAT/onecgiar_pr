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
import { EvidencesService } from '../../results/evidences/evidences.service';

/**
 * IU26-T-13 / IU26-R-13, IU26-R-9 (IPSR) — Step 3 of a 2026+ package.
 *
 * GET returns `current_use_previous` (actors, organizations, measures per unit) of the package of
 * the previous phase, found by `result_code` + the previous phase's version (DD-9) — never by
 * `result_id`, which differs in every phase. A 2025 package gets none. SAVE keeps `new_users`
 * (2026+ only) and refuses a row whose `new_users` exceeds its total.
 */
describe('InnovationPathwayStepThreeService — Innovation Use 2026 (IU26-T-13)', () => {
  let service: InnovationPathwayStepThreeService;

  const RESULT_ID = 9001; // package of the open phase
  const PREVIOUS_ID = 4001; // same result_code, previous phase
  const CORE = 66;
  const PREVIOUS_CORE = 55;
  const CODE = 777;
  const user = { id: 2 } as any;

  const mockResultRepository = { findOne: jest.fn() };
  const mockRIPRepository = { findOne: jest.fn(), update: jest.fn() };
  const mockIpsrRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
  };
  const rowsRepo = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
  });
  const mockActorRepo = rowsRepo();
  const mockUseMeasureRepo = rowsRepo();
  const mockInstTypeRepo = rowsRepo();
  const mockWorkshopRepo = { find: jest.fn() };
  const mockEvidenceRepo = {
    getIpsrStepThreeEvidences: jest.fn(),
    findOne: jest.fn(),
  };
  const mockVersioningService = { $_findActivePhase: jest.fn() };

  const flush = () => new Promise((resolve) => setImmediate(resolve));
  const statusOf = (res: any) => res?.status ?? res?.statusCode;

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
        { provide: ResultByIntitutionsRepository, useValue: {} },
        { provide: ResultIpSdgTargetRepository, useValue: {} },
        { provide: ResultsComplementaryInnovationRepository, useValue: {} },
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
        { provide: VersionsService, useValue: {} },
        { provide: VersioningService, useValue: mockVersioningService },
        { provide: EvidencesService, useValue: {} },
      ],
    }).compile();

    service = module.get(InnovationPathwayStepThreeService);
    jest.resetAllMocks();
  });

  describe('getStepThree — current_use_previous', () => {
    /** A package of the given phase year whose twin (same result_code, other id) reported rows. */
    const arrange = (
      phaseYear: number | null,
      previous: {
        actors?: any[];
        orgs?: any[];
        measures?: any[];
        found?: boolean;
      } = {},
    ) => {
      mockRIPRepository.findOne.mockResolvedValue({
        result_innovation_package_id: RESULT_ID,
        obj_result_innovation_package: {
          id: RESULT_ID,
          result_code: CODE,
          obj_version: { id: 40, phase_year: phaseYear, previous_phase: 36 },
        },
      });
      mockIpsrRepository.findOne.mockImplementation(async ({ where }: any) =>
        where.result_innovation_package_id === RESULT_ID
          ? { result_id: 1, result_by_innovation_package_id: CORE }
          : where.result_innovation_package_id === PREVIOUS_ID
            ? { result_id: 2, result_by_innovation_package_id: PREVIOUS_CORE }
            : null,
      );
      mockIpsrRepository.find.mockResolvedValue([]);
      mockResultRepository.findOne.mockImplementation(
        async ({ where }: any) => {
          if (where.result_code === CODE) {
            // the previous phase's package: matched on code + version, never on the open id
            return where.version_id === 36 && previous.found !== false
              ? { id: PREVIOUS_ID, obj_version: { phase_year: 2025 } }
              : null;
          }
          return { id: where.id, result_code: 5, title: 't', version_id: 40 };
        },
      );
      mockEvidenceRepo.getIpsrStepThreeEvidences.mockResolvedValue([]);
      mockWorkshopRepo.find.mockResolvedValue([]);
      mockActorRepo.find.mockImplementation(async ({ where }: any) =>
        where.result_ip_result_id === PREVIOUS_CORE
          ? (previous.actors ?? [])
          : [],
      );
      mockInstTypeRepo.find.mockImplementation(async ({ where }: any) =>
        where.result_ip_results_id === PREVIOUS_CORE
          ? (previous.orgs ?? [])
          : [],
      );
      mockUseMeasureRepo.find.mockImplementation(async ({ where }: any) =>
        where.result_ip_result_id === PREVIOUS_CORE
          ? (previous.measures ?? [])
          : [],
      );
    };

    it('a 2026 package with a 2025 twin holding 4,300 actors returns total_actors 4300', async () => {
      arrange(2026, {
        actors: [
          {
            sex_and_age_disaggregation: true,
            how_many: '4000',
            is_active: true,
          },
          {
            sex_and_age_disaggregation: false,
            women: 200,
            men: 100,
            is_active: true,
          },
        ],
        orgs: [{ how_many: 12, institution_roles_id: 6, is_active: true }],
        measures: [
          { unit_of_measure: 'Hectares', quantity: 30, is_active: true },
          { unit_of_measure: 'hectares ', quantity: 20, is_active: true },
        ],
      });

      const res: any = await service.getStepThree(RESULT_ID);

      expect(res.response.current_use_previous).toEqual({
        result_id: PREVIOUS_ID,
        phase_year: 2025,
        total_actors: 4300,
        total_organizations: 12,
        measures: [{ unit: 'Hectares', quantity: 50 }],
      });
    });

    it('a 2025 package gets no current_use_previous and no lookup is made', async () => {
      arrange(2025, { actors: [{ how_many: 10, is_active: true }] });

      const res: any = await service.getStepThree(RESULT_ID);

      expect(res.response).not.toHaveProperty('current_use_previous');
      expect(mockResultRepository.findOne).not.toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ result_code: CODE }),
        }),
      );
    });

    it('a 2026 package whose twin cannot be found by result_code + version returns null', async () => {
      arrange(2026, { found: false });

      const res: any = await service.getStepThree(RESULT_ID);

      expect(res.response.current_use_previous).toBeNull();
    });

    it('a previous package that reported nothing returns null (the block stays hidden)', async () => {
      arrange(2026, {});

      const res: any = await service.getStepThree(RESULT_ID);

      expect(res.response.current_use_previous).toBeNull();
    });
  });

  describe('saveComplementaryinnovation — new_users', () => {
    const body = (innovatonUse: any) =>
      ({
        result_innovation_package: {
          result_innovation_package_id: RESULT_ID,
          assessed_during_expert_workshop_id: 1,
        },
        result_ip_result_core: { result_by_innovation_package_id: CORE },
        result_ip_result_complementary: [],
        innovatonUse,
      }) as any;

    const arrange = (phaseYear: number | null) => {
      mockResultRepository.findOne.mockResolvedValue({
        id: RESULT_ID,
        obj_version: { phase_year: phaseYear },
      });
      mockVersioningService.$_findActivePhase.mockResolvedValue({ id: 1 });
      mockIpsrRepository.find.mockResolvedValue([]);
      mockIpsrRepository.findOne.mockResolvedValue({
        result_by_innovation_package_id: CORE,
        obj_use_level_evidence_based: { level: 3 },
      });
      mockIpsrRepository.update.mockResolvedValue({});
      mockRIPRepository.update.mockResolvedValue({});
      mockRIPRepository.findOne.mockResolvedValue(null);
      mockActorRepo.findOne.mockResolvedValue(null);
      mockActorRepo.save.mockResolvedValue({});
      mockInstTypeRepo.findOne.mockResolvedValue(null);
      mockInstTypeRepo.save.mockResolvedValue({});
      mockUseMeasureRepo.findOne.mockResolvedValue(null);
      mockUseMeasureRepo.save.mockResolvedValue({});
    };

    const actor = (extra: any) => ({
      actor_type_id: 1,
      sex_and_age_disaggregation: true,
      how_many: 100,
      is_active: true,
      ...extra,
    });

    it('refuses an actor row whose new_users exceeds its how_many, naming the row, and writes nothing', async () => {
      arrange(2026);

      const res: any = await service.saveComplementaryinnovation(
        RESULT_ID,
        user,
        body({
          actors: [actor({ new_users: 101 })],
          organization: [],
          measures: [],
        }),
      );
      await flush();

      expect(statusOf(res)).toBe(HttpStatus.BAD_REQUEST);
      expect(res.message).toMatch(/actor/i);
      expect(res.message).toMatch(/101/);
      expect(mockRIPRepository.update).not.toHaveBeenCalled();
      expect(mockActorRepo.save).not.toHaveBeenCalled();
    });

    it('counts women + men when the disaggregation is off', async () => {
      arrange(2026);

      const res: any = await service.saveComplementaryinnovation(
        RESULT_ID,
        user,
        body({
          actors: [
            actor({
              sex_and_age_disaggregation: false,
              women: 30,
              men: 20,
              how_many: null,
              new_users: 51,
            }),
          ],
          organization: [],
          measures: [],
        }),
      );

      expect(statusOf(res)).toBe(HttpStatus.BAD_REQUEST);
    });

    it('refuses an organization row over its how_many and a measure row over its quantity', async () => {
      arrange(2026);

      const org: any = await service.saveComplementaryinnovation(
        RESULT_ID,
        user,
        body({
          actors: [],
          organization: [
            {
              institution_types_id: 3,
              how_many: 5,
              new_users: 6,
              is_active: true,
            },
          ],
          measures: [],
        }),
      );
      const measure: any = await service.saveComplementaryinnovation(
        RESULT_ID,
        user,
        body({
          actors: [],
          organization: [],
          measures: [
            {
              unit_of_measure: 'Hectares',
              quantity: 10,
              new_users: 11,
              is_active: true,
            },
          ],
        }),
      );

      expect(statusOf(org)).toBe(HttpStatus.BAD_REQUEST);
      expect(org.message).toMatch(/organi[sz]ation/i);
      expect(statusOf(measure)).toBe(HttpStatus.BAD_REQUEST);
      expect(measure.message).toMatch(/Hectares/);
    });

    it('persists new_users on new rows of a 2026 package when it is within the total', async () => {
      arrange(2026);

      await service.saveComplementaryinnovation(
        RESULT_ID,
        user,
        body({
          actors: [actor({ new_users: 40 })],
          organization: [
            {
              institution_types_id: 3,
              how_many: 5,
              new_users: 5,
              is_active: true,
            },
          ],
          measures: [
            {
              unit_of_measure: 'Hectares',
              quantity: 10,
              new_users: 0,
              is_active: true,
            },
          ],
        }),
      );
      await flush();

      expect(mockActorRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ new_users: 40 }),
      );
      expect(mockInstTypeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ new_users: 5 }),
      );
      expect(mockUseMeasureRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ new_users: 0 }),
      );
    });

    it('ignores new_users on a 2025 package (neither validated nor stored)', async () => {
      arrange(2025);

      const res: any = await service.saveComplementaryinnovation(
        RESULT_ID,
        user,
        body({
          actors: [actor({ new_users: 999 })],
          organization: [],
          measures: [],
        }),
      );
      await flush();

      expect(statusOf(res)).not.toBe(HttpStatus.BAD_REQUEST);
      expect(mockActorRepo.save).toHaveBeenCalledWith(
        expect.not.objectContaining({ new_users: 999 }),
      );
    });
  });
});
