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
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { SourceEnum } from '../../results/entities/result.entity';

describe('BilateralCenterService', () => {
  let service: BilateralCenterService;
  let versioningService: VersioningService;
  let resultRepository: ResultRepository;
  let resultByLevelRepository: ResultByLevelRepository;
  let yearRepository: YearRepository;
  let bilateralProjectsService: BilateralProjectsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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
            findOne: jest.fn(),
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
            find: jest.fn(),
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
            save: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: ResultsByProjectsRepository,
          useValue: {
            findOne: jest.fn().mockResolvedValue(null),
            save: jest.fn().mockResolvedValue({}),
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
        result_type_id: 6,
      });

      expect(result.response.id).toBe(99);
      expect(result.response.source).toBe(SourceEnum.Bilateral);
      expect(result.response.status_id).toBe(1);
      expect(resultRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          created_by: 42,
          result_level_id: 2,
          result_type_id: 6,
          result_code: 0,
          source: SourceEnum.Bilateral,
          status_id: 1,
        }),
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
  });
});
