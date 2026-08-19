import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { BilateralCenterService } from './bilateral-center.service';
import { BilateralProjectsService } from './bilateral-projects.service';
import { BilateralService } from '../bilateral.service';
import { VersioningService } from '../../versioning/versioning.service';
import { ResultRepository } from '../../results/result.repository';
import { ResultByLevelRepository } from '../../results/result-by-level/result-by-level.repository';
import { YearRepository } from '../../results/years/year.repository';
import { ResultsTocResultsService } from '../../results/results-toc-results/results-toc-results.service';
import { ResultsTocResultRepository } from '../../results/results-toc-results/repositories/results-toc-results.repository';
import { ResultByInitiativesRepository } from '../../results/results_by_inititiatives/resultByInitiatives.repository';
import { ClarisaInitiativesRepository } from '../../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { ClarisaCentersRepository } from '../../../clarisa/clarisa-centers/clarisa-centers.repository';
import { ClarisaInstitutionsRepository } from '../../../clarisa/clarisa-institutions/ClariasaInstitutions.repository';
import { ResultsCenterRepository } from '../../results/results-centers/results-centers.repository';
import { ResultsByProjectsRepository } from '../../results/results_by_projects/results_by_projects.repository';
import { ResultsByProjectsService } from '../../results/results_by_projects/results_by_projects.service';
import { ResultsKnowledgeProductsService } from '../../results/results-knowledge-products/results-knowledge-products.service';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { SourceEnum } from '../../results/entities/result.entity';

describe('BilateralCenterService', () => {
  let service: BilateralCenterService;
  let module: TestingModule;
  let versioningService: VersioningService;
  let resultRepository: ResultRepository;
  let resultByLevelRepository: ResultByLevelRepository;
  let yearRepository: YearRepository;
  let bilateralProjectsService: BilateralProjectsService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        BilateralCenterService,
        {
          provide: BilateralProjectsService,
          useValue: {
            getProjectsByCenter: jest.fn().mockResolvedValue({ projects: [] }),
          },
        },
        {
          provide: BilateralService,
          useValue: {
            handleLeadCenter: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: VersioningService,
          useValue: {
            $_findActivePhase: jest.fn().mockResolvedValue({ id: 1 }),
          },
        },
        {
          provide: ResultRepository,
          useValue: {
            save: jest.fn().mockResolvedValue({
              id: 99,
              result_level_id: 2,
              result_type_id: 6,
              source: SourceEnum.Bilateral,
              status_id: 1,
            }),
            update: jest.fn().mockResolvedValue({}),
            // Re-read after the insert. `result_code` is assigned by the `result_auto_code` trigger,
            // so a realistic row carries a real code here — the 0 passed to save() is a placeholder.
            findOne: jest.fn().mockResolvedValue({
              id: 99,
              result_code: 8852,
              version_id: 1,
            }),
          },
        },
        {
          provide: ResultByLevelRepository,
          useValue: {
            getByTypeAndLevel: jest.fn().mockResolvedValue({ id: 1 }),
          },
        },
        {
          provide: YearRepository,
          useValue: {
            findOne: jest.fn().mockResolvedValue({ year: 2025 }),
          },
        },
        {
          provide: ResultsTocResultsService,
          useValue: {
            updatePlannedResult: jest.fn().mockResolvedValue({}),
            updateTocResultPartial: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: ResultsTocResultRepository,
          useValue: {
            findOne: jest.fn(),
            query: jest.fn(),
          },
        },
        {
          provide: ResultByInitiativesRepository,
          useValue: {
            getOwnerInitiativeByResult: jest.fn().mockResolvedValue({ id: 1 }),
            save: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: ClarisaInitiativesRepository,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: ClarisaCentersRepository,
          useValue: {
            find: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: ClarisaInstitutionsRepository,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: ResultsCenterRepository,
          useValue: {
            findOne: jest.fn().mockResolvedValue(null),
            find: jest.fn().mockResolvedValue([]),
            save: jest.fn().mockResolvedValue({}),
            update: jest.fn().mockResolvedValue({}),
            updateCenter: jest.fn().mockResolvedValue({}),
            getAllResultsCenterByResultIdAndCenterId: jest
              .fn()
              .mockResolvedValue(undefined),
          },
        },
        {
          provide: ResultsByProjectsRepository,
          useValue: {
            findOne: jest.fn().mockResolvedValue(null),
            save: jest.fn().mockResolvedValue({}),
            update: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: ResultsByProjectsService,
          useValue: {
            syncBilateralProjects: jest.fn().mockResolvedValue({
              status: 200,
              message: 'ok',
              response: { set_active: [], deactivated: [] },
            }),
          },
        },
        {
          provide: ResultsKnowledgeProductsService,
          useValue: {
            populateKPFromCGSpace: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    }).compile();

    service = module.get<BilateralCenterService>(BilateralCenterService);
    versioningService = module.get<VersioningService>(VersioningService);
    resultRepository = module.get<ResultRepository>(ResultRepository);
    resultByLevelRepository = module.get<ResultByLevelRepository>(
      ResultByLevelRepository,
    );
    yearRepository = module.get<YearRepository>(YearRepository);
    bilateralProjectsService = module.get<BilateralProjectsService>(
      BilateralProjectsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return projects for a numeric centerId', async () => {
    const result = await service.getProjects(10);
    expect(result).toEqual({ response: { projects: [] } });
    expect(bilateralProjectsService.getProjectsByCenter).toHaveBeenCalledWith(
      10,
    );
  });

  describe('createResultHeader', () => {
    const user: TokenDto = {
      id: 42,
      email: 'test@cgiar.org',
      first_name: 'Test',
      last_name: 'User',
    };

    it('should create a result header', async () => {
      const result = await service.createResultHeader(user, {
        result_level_id: 2,
        result_type_id: 7,
      });

      expect(result.response.id).toBe(99);
      expect(result.response.source).toBe(SourceEnum.Bilateral);
      expect(result.response.status_id).toBe(1);
      // The trigger-assigned code, not the 0 placeholder handed to save().
      expect(result.response.result_code).toBe(8852);
      expect(resultRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          created_by: 42,
          result_level_id: 2,
          result_type_id: 7,
          result_code: 0,
          source: SourceEnum.Bilateral,
          status_id: 1,
        }),
      );
    });

    // A 0 result_code means the `result_auto_code` trigger is missing from the environment. Every
    // bilateral row then shares code 0, and the detail endpoint resolves by result_code whenever a
    // phase is supplied — so the user would silently open somebody else's draft. Logged rather than
    // thrown: throwing would take bilateral creation down entirely in a mis-migrated environment.
    it('logs when the row comes back without a trigger-assigned result_code', async () => {
      const logger = jest
        .spyOn((service as any).logger, 'error')
        .mockImplementation(() => undefined);
      jest.spyOn(resultRepository, 'findOne').mockResolvedValue({
        id: 99,
        result_code: 0,
        version_id: 1,
      } as any);

      const result = await service.createResultHeader(user, {
        result_level_id: 2,
        result_type_id: 7,
      });

      expect(result.response.result_code).toBe(0);
      expect(logger).toHaveBeenCalledWith(
        expect.stringContaining('was created without a result_code'),
      );
    });

    it('should reject CAPACITY_CHANGE type (id=3)', async () => {
      await expect(
        service.createResultHeader(user, {
          result_level_id: 1,
          result_type_id: 3,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid level/type combination', async () => {
      jest
        .spyOn(resultByLevelRepository, 'getByTypeAndLevel')
        .mockResolvedValue(undefined);

      await expect(
        service.createResultHeader(user, {
          result_level_id: 99,
          result_type_id: 99,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when no active phase exists', async () => {
      jest
        .spyOn(versioningService, '$_findActivePhase')
        .mockResolvedValue(null);

      await expect(
        service.createResultHeader(user, {
          result_level_id: 2,
          result_type_id: 6,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when no active year exists', async () => {
      jest.spyOn(yearRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.createResultHeader(user, {
          result_level_id: 2,
          result_type_id: 6,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    describe('Knowledge Product via CGSpace handle', () => {
      it('should populate the result from CGSpace when a handle is provided', async () => {
        const resultsKnowledgeProductsService =
          module.get<ResultsKnowledgeProductsService>(
            ResultsKnowledgeProductsService,
          );

        await service.createResultHeader(user, {
          result_level_id: 2,
          result_type_id: 6,
          handle: '10568/175322',
        });

        expect(
          resultsKnowledgeProductsService.populateKPFromCGSpace,
        ).toHaveBeenCalledWith(99, '10568/175322', user);
      });

      it('should soft-delete the result and reject when CGSpace population fails', async () => {
        const resultsKnowledgeProductsService =
          module.get<ResultsKnowledgeProductsService>(
            ResultsKnowledgeProductsService,
          );
        jest
          .spyOn(resultsKnowledgeProductsService, 'populateKPFromCGSpace')
          .mockRejectedValue(new Error('Handle not found on CGSpace'));

        await expect(
          service.createResultHeader(user, {
            result_level_id: 2,
            result_type_id: 6,
            handle: 'bad-handle',
          }),
        ).rejects.toThrow(BadRequestException);

        expect(resultRepository.update).toHaveBeenCalledWith(99, {
          is_active: false,
        });
      });

      it('should not call CGSpace population for non-Knowledge-Product types', async () => {
        const resultsKnowledgeProductsService =
          module.get<ResultsKnowledgeProductsService>(
            ResultsKnowledgeProductsService,
          );

        await service.createResultHeader(user, {
          result_level_id: 2,
          result_type_id: 7,
        });

        expect(
          resultsKnowledgeProductsService.populateKPFromCGSpace,
        ).not.toHaveBeenCalled();
      });
    });
  });

  describe('saveContributors', () => {
    const user: TokenDto = {
      id: 42,
      email: 'test@cgiar.org',
      first_name: 'Test',
      last_name: 'User',
    };

    it('should sync-replace centers via updateCenter', async () => {
      jest.spyOn(resultRepository, 'findOne').mockResolvedValue({
        id: 10,
        source: SourceEnum.Bilateral,
      } as any);
      const clarisaCentersRepository = module.get<ClarisaCentersRepository>(
        ClarisaCentersRepository,
      );
      const resultsCenterRepository = module.get<ResultsCenterRepository>(
        ResultsCenterRepository,
      );
      jest
        .spyOn(clarisaCentersRepository, 'find')
        .mockResolvedValue([{ institutionId: 501, code: 'ABC' }] as any);

      const result = await service.saveContributors(
        10,
        { contributing_center: [{ institution_id: 501 }] },
        user,
      );

      expect(resultsCenterRepository.updateCenter).toHaveBeenCalledWith(
        10,
        ['ABC'],
        42,
      );
      expect(resultsCenterRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          result_id: 10,
          center_id: 'ABC',
          is_active: true,
        }),
      );
      expect(result.message).toBe('Contributors saved successfully');
    });

    it('should sync-replace projects via syncBilateralProjects and set is_lead', async () => {
      jest.spyOn(resultRepository, 'findOne').mockResolvedValue({
        id: 10,
        source: SourceEnum.Bilateral,
      } as any);
      const resultsByProjectsService = module.get<ResultsByProjectsService>(
        ResultsByProjectsService,
      );
      const resultsByProjectsRepository =
        module.get<ResultsByProjectsRepository>(ResultsByProjectsRepository);
      jest
        .spyOn(resultsByProjectsService, 'syncBilateralProjects')
        .mockResolvedValue({
          status: 200,
          message: 'ok',
          response: {
            set_active: [1, 2],
            deactivated: [3],
          },
        } as any);

      const result = await service.saveContributors(
        10,
        {
          contributing_bilateral_projects: [
            { project_id: 1, is_lead: true },
            { project_id: 2, is_lead: false },
          ],
        },
        user,
      );

      expect(
        resultsByProjectsService.syncBilateralProjects,
      ).toHaveBeenCalledWith(
        10,
        [
          { project_id: 1, is_lead: true },
          { project_id: 2, is_lead: false },
        ],
        42,
      );
      expect(resultsByProjectsRepository.update).toHaveBeenCalled();
      expect((result.response as any).deactivatedProjects).toEqual([3]);
      expect(result.message).toBe('Contributors saved successfully');
    });
  });
});
