import { Test, TestingModule } from '@nestjs/testing';
import { VersioningService } from './versioning.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Result } from '../results/entities/result.entity';
import { ResultsKnowledgeProductAltmetricRepository } from '../results/results-knowledge-products/repositories/results-knowledge-product-altmetrics.repository';
import { VersionRepository } from './versioning.repository';
import {
  HandlersError,
  ReturnResponse,
} from '../../shared/handlers/error.utils';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';
import { ApplicationModulesRepository } from './repositories/application-modules.repository';
import { ResultRepository } from '../results/result.repository';
import { NonPooledProjectRepository } from '../results/non-pooled-projects/non-pooled-projects.repository';
import { ResultsCenterRepository } from '../results/results-centers/results-centers.repository';
import { ResultsTocResultRepository } from '../results/results-toc-results/repositories/results-toc-results.repository';
import { ResultByInitiativesRepository } from '../results/results_by_inititiatives/resultByInitiatives.repository';
import { ResultByIntitutionsRepository } from '../results/results_by_institutions/result_by_intitutions.repository';
import { ResultByInstitutionsByDeliveriesTypeRepository } from '../results/result-by-institutions-by-deliveries-type/result-by-institutions-by-deliveries-type.repository';
import { ResultByIntitutionsTypeRepository } from '../results/results_by_institution_types/result_by_intitutions_type.repository';
import { ResultCountryRepository } from '../results/result-countries/result-countries.repository';
import { ResultRegionRepository } from '../results/result-regions/result-regions.repository';
import { LinkedResultRepository } from '../results/linked-results/linked-results.repository';
import { EvidencesRepository } from '../results/evidences/evidences.repository';
import { ResultsCapacityDevelopmentsRepository } from '../results/summary/repositories/results-capacity-developments.repository';
import { ResultsImpactAreaIndicatorRepository } from '../results/results-impact-area-indicators/results-impact-area-indicators.repository';
import { ResultsPolicyChangesRepository } from '../results/summary/repositories/results-policy-changes.repository';
import { ResultsInnovationsDevRepository } from '../results/summary/repositories/results-innovations-dev.repository';
import { ResultsInnovationsUseRepository } from '../results/summary/repositories/results-innovations-use.repository';
import { ResultsInnovationsUseMeasuresRepository } from '../results/summary/repositories/results-innovations-use-measures.repository';
import { ResultsKnowledgeProductsRepository } from '../results/results-knowledge-products/repositories/results-knowledge-products.repository';
import { ResultsKnowledgeProductAuthorRepository } from '../results/results-knowledge-products/repositories/results-knowledge-product-authors.repository';
import { ResultsKnowledgeProductKeywordRepository } from '../results/results-knowledge-products/repositories/results-knowledge-product-keywords.repository';
import { ResultsKnowledgeProductMetadataRepository } from '../results/results-knowledge-products/repositories/results-knowledge-product-metadata.repository';
import { ResultsKnowledgeProductInstitutionRepository } from '../results/results-knowledge-products/repositories/results-knowledge-product-institution.repository';
import { RoleByUserRepository } from '../../auth/modules/role-by-user/RoleByUser.repository';
import { ResultsTocResultIndicatorsRepository } from '../results/results-toc-results/repositories/results-toc-results-indicators.repository';
import { ResultsTocSdgTargetRepository } from '../results/results-toc-results/repositories/result-toc-sdg-target.repository';
import { ResultsTocImpactAreaTargetRepository } from '../results/results-toc-results/repositories/result-toc-impact-area.repository';
import { ResultsSdgTargetRepository } from '../results/results-toc-results/repositories/results-sdg-targets.repository';
import { ResultStatusRepository } from '../results/result-status/result-status.repository';
import { ResultsActionAreaOutcomeRepository } from '../results/results-toc-results/repositories/result-toc-action-area.repository';
import { ResultsTocTargetIndicatorRepository } from '../results/results-toc-results/repositories/result-toc-result-target-indicator.repository';
import { ResultInitiativeBudgetRepository } from '../results/result_budget/repositories/result_initiative_budget.repository';
import { EvidenceSharepointRepository } from '../results/evidences/repositories/evidence-sharepoint.repository';
import { EvidencesService } from '../results/evidences/evidences.service';
import { ShareResultRequestRepository } from '../results/share-result-request/share-result-request.repository';
import { GlobalParameterCacheService } from '../../shared/services/cache/global-parameter-cache.service';
import { SharePointService } from '../../shared/services/share-point/share-point.service';
import { GlobalParameterService } from '../global-parameter/global-parameter.service';
import { HttpModule } from '@nestjs/axios';
import { GlobalParameterRepository } from '../global-parameter/repositories/global-parameter.repository';
import { HttpStatus } from '@nestjs/common';
import { ReturnResponseUtil } from '../../shared/utils/response.util';
import { ResultTypeEnum } from '../../shared/constants/result-type.enum';
import { ResultCountrySubnationalRepository } from '../results/result-countries-sub-national/repositories/result-country-subnational.repository';
import { NonPooledProjectBudgetRepository } from '../results/result_budget/repositories/non_pooled_proyect_budget.repository';
import { ResultInstitutionsBudgetRepository } from '../results/result_budget/repositories/result_institutions_budget.repository';
import { ResultActorRepository } from '../results/result-actors/repositories/result-actors.repository';
import { IpsrRepository } from '../ipsr/ipsr.repository';
import { ResultInnovationPackageRepository } from '../ipsr/result-innovation-package/repositories/result-innovation-package.repository';
import { ResultIpAAOutcomeRepository } from '../ipsr/innovation-pathway/repository/result-ip-action-area-outcome.repository';
import { ResultIpEoiOutcomeRepository } from '../ipsr/innovation-pathway/repository/result-ip-eoi-outcomes.repository';
import { ResultIpImpactAreaRepository } from '../ipsr/innovation-pathway/repository/result-ip-impact-area-targets.repository';
import { ResultIpSdgTargetRepository } from '../ipsr/innovation-pathway/repository/result-ip-sdg-targets.repository';
import { InnovationPackagingExpertRepository } from '../ipsr/innovation-packaging-experts/repositories/innovation-packaging-expert.repository';
import { ResultIpMeasureRepository } from '../ipsr/result-ip-measures/result-ip-measures.repository';
import { ResultIpExpertisesRepository } from '../ipsr/innovation-packaging-experts/repositories/result-ip-expertises.repository';
import { ResultIpExpertWorkshopOrganizedRepostory } from '../ipsr/innovation-pathway/repository/result-ip-expert-workshop-organized.repository';
import { ResultsIpActorRepository } from '../ipsr/results-ip-actors/results-ip-actor.repository';
import { ResultsByIpInnovationUseMeasureRepository } from '../ipsr/results-by-ip-innovation-use-measures/results-by-ip-innovation-use-measure.repository';
import { ResultsIpInstitutionTypeRepository } from '../ipsr/results-ip-institution-type/results-ip-institution-type.repository';
import { ResultAnswerRepository } from '../results/result-questions/repository/result-answers.repository';
import { MQAPService } from '../m-qap/m-qap.service';
import { MQAPModule } from '../m-qap/m-qap.module';
import { ClarisaInitiativesRepository } from '../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import {
  ModuleTypeEnum,
  StatusPhaseEnum,
  ActiveEnum,
} from '../../shared/constants/role-type.enum';

describe('VersioningService', () => {
  let service: VersioningService;
  let resultRepository;
  let versionRepository;

  const muckResult = new Result();
  muckResult.id = 3;
  muckResult.result_code = 3;
  muckResult.result_type_id = 5;
  muckResult.version_id = 2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VersioningService,
        VersionRepository,
        HandlersError,
        ResponseInterceptor,
        ApplicationModulesRepository,
        ResultRepository,
        ReturnResponse,
        NonPooledProjectRepository,
        ResultsCenterRepository,
        ResultsTocResultRepository,
        ResultByInitiativesRepository,
        ResultByIntitutionsRepository,
        ResultByInstitutionsByDeliveriesTypeRepository,
        ResultByIntitutionsTypeRepository,
        ResultCountryRepository,
        ResultRegionRepository,
        LinkedResultRepository,
        ResultsCapacityDevelopmentsRepository,
        ResultsImpactAreaIndicatorRepository,
        ResultsPolicyChangesRepository,
        ResultsInnovationsDevRepository,
        ResultsInnovationsUseRepository,
        ResultsInnovationsUseMeasuresRepository,
        ResultsKnowledgeProductsRepository,
        ResultsKnowledgeProductAltmetricRepository,
        ResultsKnowledgeProductAuthorRepository,
        ResultsKnowledgeProductKeywordRepository,
        ResultsKnowledgeProductMetadataRepository,
        ResultsKnowledgeProductInstitutionRepository,
        RoleByUserRepository,
        ResultsTocResultIndicatorsRepository,
        ResultsTocSdgTargetRepository,
        ResultsTocImpactAreaTargetRepository,
        ResultsSdgTargetRepository,
        ResultStatusRepository,
        ResultsActionAreaOutcomeRepository,
        ResultsTocTargetIndicatorRepository,
        ResultInitiativeBudgetRepository,
        EvidenceSharepointRepository,
        EvidencesService,
        ShareResultRequestRepository,
        ResultCountrySubnationalRepository,
        ResultAnswerRepository,
        NonPooledProjectBudgetRepository,
        ResultInstitutionsBudgetRepository,
        ResultActorRepository,
        IpsrRepository,
        ResultInnovationPackageRepository,
        ResultIpAAOutcomeRepository,
        ResultIpEoiOutcomeRepository,
        ResultIpImpactAreaRepository,
        ResultIpSdgTargetRepository,
        InnovationPackagingExpertRepository,
        ResultIpMeasureRepository,
        ResultIpExpertisesRepository,
        ResultIpExpertWorkshopOrganizedRepostory,
        ResultsIpActorRepository,
        ResultsByIpInnovationUseMeasureRepository,
        ResultsIpInstitutionTypeRepository,
        MQAPService,
        ClarisaInitiativesRepository,
        {
          provide: GlobalParameterCacheService,
          useValue: {
            loadAllGlobalParamatersByCategory: jest.fn(),
          },
        },
        {
          provide: SharePointService,
          useValue: {
            getDocument: jest.fn(),
            createUploadSession: jest.fn(),
            generateFilePath: jest.fn().mockReturnValue({
              filePath: 'www.sharepoint.com/file',
            }),
          },
        },
        GlobalParameterService,
        GlobalParameterRepository,
        {
          provide: getRepositoryToken(Result),
          useClass: Repository,
        },
        {
          provide: ResultRepository,
          useValue: {
            findOne: jest.fn(),
            replicate: jest.fn(),
            find: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: VersionRepository,
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
            $_getAllInovationDevToReplicate: jest.fn(),
          },
        },
        {
          provide: EvidencesRepository,
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            query: jest.fn(),
            replicate: jest.fn(),
            getEvidencesByResultId: jest
              .fn()
              .mockResolvedValue([
                { id: 1, link: 'www.link.com', result_id: 3 },
              ]),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createEntityManager: jest.fn().mockReturnThis(),
            transaction: jest.fn().mockImplementation((cb) =>
              cb({
                getRepository: jest.fn().mockReturnValue({
                  findOne: jest.fn().mockResolvedValue({}),
                  find: jest
                    .fn()
                    .mockResolvedValue([])
                    .mockResolvedValue([
                      {
                        id: 323,
                        result_code: 3,
                        result_type_id: 5,
                        version_id: 4,
                      },
                    ]),
                  query: jest.fn().mockResolvedValue([{}]),
                  save: jest.fn().mockResolvedValue({}),
                  createQueryBuilder: jest.fn().mockReturnValue({
                    leftJoinAndSelect: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    getOne: jest.fn().mockResolvedValue({}),
                    getMany: jest.fn().mockResolvedValue([]),
                  }),
                }),
              }),
            ),
            getRepository: jest.fn().mockReturnValue({
              findOne: jest.fn().mockResolvedValue({}),
            }),
          },
        },
      ],
      imports: [HttpModule, MQAPModule],
    }).compile();

    service = module.get<VersioningService>(VersioningService);

    resultRepository = module.get<ResultRepository>(ResultRepository);
    versionRepository = module.get<VersionRepository>(VersionRepository);
  });

  it('should throw an error if the result is not found', async () => {
    resultRepository.findOne.mockResolvedValueOnce(null);
    await expect(service.versionProcess(1, {} as any)).rejects.toEqual(
      ReturnResponseUtil.format({
        message: `Result ID: 1 not found`,
        response: 1,
        statusCode: HttpStatus.NOT_FOUND,
      }),
    );
  });

  it('should respond ok when everything turns out correct result type 6 ', async () => {
    resultRepository.findOne.mockResolvedValueOnce({
      id: 2,
      result_type_id: 6,
    } as any);
    await expect(service.versionProcess(2, {} as any)).rejects.toEqual(
      ReturnResponseUtil.format({
        message: `Result ID: 2 is a Knowledge Product, this type of result is not possible to phase shift it contact support`,
        response: 2,
        statusCode: HttpStatus.CONFLICT,
      }),
    );
  });

  it('should throw an error if the phase is not found', async () => {
    resultRepository.findOne.mockResolvedValueOnce({
      id: 3,
      result_code: 3,
      result_type_id: 5,
      version_id: 1,
    } as any);
    versionRepository.findOne.mockResolvedValueOnce(null);
    await expect(service.versionProcess(3, {} as any)).rejects.toEqual(
      ReturnResponseUtil.format({
        message: `No active phases`,
        response: null,
        statusCode: HttpStatus.CONFLICT,
      }),
    );
  });

  it('should throw an error if the result is already in the phase', async () => {
    resultRepository.findOne.mockResolvedValueOnce(muckResult);
    versionRepository.findOne.mockResolvedValueOnce({
      id: 2,
      phase_name: 'Reporting 2023',
    });
    resultRepository.findOne.mockResolvedValueOnce({
      id: 3,
    } as any);
    await expect(service.versionProcess(3, { id: 601 } as any)).rejects.toEqual(
      ReturnResponseUtil.format({
        message: `The result 3 is already in the Reporting 2023 phase`,
        response: 3,
        statusCode: HttpStatus.CONFLICT,
      }),
    );
  });

  it('should throw an error if the result failed', async () => {
    resultRepository.findOne.mockResolvedValueOnce(muckResult);
    versionRepository.findOne.mockResolvedValueOnce({
      id: 4,
      phase_name: 'Reporting 2023',
    });
    resultRepository.findOne.mockResolvedValueOnce(null);
    await expect(service.versionProcess(3, { id: 601 } as any)).rejects.toEqual(
      ReturnResponseUtil.format({
        message: `The result 3 could not be replicated`,
        response: null,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      }),
    );
  });

  it('should responde ok when everything turns out correct result type 5', async () => {
    resultRepository.findOne.mockResolvedValueOnce(muckResult);
    versionRepository.findOne.mockResolvedValueOnce({
      id: 4,
      phase_name: 'Reporting 2023',
    });
    resultRepository.findOne.mockResolvedValueOnce(null);
    resultRepository.replicate.mockResolvedValueOnce([
      {
        id: 354,
        result_code: 3,
        result_type_id: 5,
        version_id: 4,
      },
    ] as any);

    await expect(await service.versionProcess(3, { id: 601 } as any)).toEqual(
      ReturnResponseUtil.format({
        message: `The result 3 is in the Reporting 2023 phase with id 354`,
        response: { id: 354, result_code: 3, result_type_id: 5, version_id: 4 },
        statusCode: HttpStatus.OK,
      }),
    );
  });

  const resultTypeIds = [1, 2, 3, 4, 5, 7, 8, 9];

  resultTypeIds.forEach((resultTypeId) => {
    it(`should respond ok when everything turns out correct result type ${resultTypeId}`, async () => {
      resultRepository.findOne.mockResolvedValueOnce({
        id: 3,
        result_code: 3,
        result_type_id: resultTypeId,
        version_id: 2,
      } as any);
      versionRepository.findOne.mockResolvedValueOnce({
        id: 4,
        phase_name: 'Reporting 2023',
      });
      resultRepository.findOne.mockResolvedValueOnce(null);
      resultRepository.replicate.mockResolvedValueOnce([
        {
          id: 354,
          result_code: 3,
          result_type_id: resultTypeId,
          version_id: 4,
        },
      ] as any);

      await expect(await service.versionProcess(3, { id: 601 } as any)).toEqual(
        ReturnResponseUtil.format({
          message: `The result 3 is in the Reporting 2023 phase with id 354`,
          response: {
            id: 354,
            result_code: 3,
            result_type_id: resultTypeId,
            version_id: 4,
          },
          statusCode: HttpStatus.OK,
        }),
      );
    });
  });

  it(`Should throw an error if there is no open phase in annualReplicationProcessInnovationDev`, async () => {
    versionRepository.findOne.mockResolvedValueOnce(null);
    await expect(
      service.annualReplicationProcessInnovationDev({ id: 601 } as any),
    ).rejects.toEqual(
      ReturnResponseUtil.format({
        message: `There is no active phase`,
        response: null,
        statusCode: HttpStatus.NOT_FOUND,
      }),
    );
  });

  it(`Should response on an 0 when there is not a result to replicate`, async () => {
    versionRepository.findOne.mockResolvedValueOnce({
      id: 4,
      phase_name: 'Reporting 2023',
    });
    versionRepository.$_getAllInovationDevToReplicate.mockResolvedValueOnce([]);
    await expect(
      await service.annualReplicationProcessInnovationDev({ id: 601 } as any),
    ).toEqual(
      ReturnResponseUtil.format({
        message: `The results were replicated successfully`,
        response: 0,
        statusCode: HttpStatus.OK,
      }),
    );
  });

  it(`Should response on an 1 when there is not a result to replicate`, async () => {
    versionRepository.findOne.mockResolvedValueOnce({
      id: 4,
      phase_name: 'Reporting 2023',
    });
    versionRepository.$_getAllInovationDevToReplicate.mockResolvedValueOnce([
      {
        id: 354,
        result_code: 3,
        result_type_id: ResultTypeEnum.INNOVATION_DEVELOPMENT,
        version_id: 3,
      },
    ]);

    resultRepository.replicate.mockResolvedValueOnce([
      {
        id: 354,
        result_code: 3,
        result_type_id: ResultTypeEnum.INNOVATION_DEVELOPMENT,
        version_id: 3,
      },
    ] as any);
    await expect(
      await service.annualReplicationProcessInnovationDev({ id: 601 } as any),
    ).toEqual(
      ReturnResponseUtil.format({
        message: `The results were replicated successfully`,
        response: 1,
        statusCode: HttpStatus.OK,
      }),
    );
  });

  describe('find (paginated)', () => {
    const mockVersion = {
      id: 1,
      phase_name: 'Test Phase',
      start_date: '2023-01-01',
      end_date: '2023-12-31',
      phase_year: 2023,
      status: true,
      previous_phase: null,
      app_module_id: 1,
      reporting_phase: null,
      portfolio_id: 1,
      is_active: true,
      obj_previous_phase: null,
      obj_reporting_phase: null,
      obj_portfolio: { id: 1, acronym: 'TEST' },
    };

    beforeEach(() => {
      // Reset mocks
      versionRepository.find.mockClear();
      versionRepository.count.mockClear();
      resultRepository.createQueryBuilder.mockClear();
      versionRepository.createQueryBuilder.mockClear();
    });

    it('should return paginated results with default pagination (page=1, limit=50)', async () => {
      versionRepository.count.mockResolvedValueOnce(25);
      versionRepository.find.mockResolvedValueOnce([mockVersion]);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      resultRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      versionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.find(
        ModuleTypeEnum.REPORTING,
        StatusPhaseEnum.OPEN,
        ActiveEnum.ACTIVE,
      );

      expect(versionRepository.count).toHaveBeenCalled();
      expect(versionRepository.find).toHaveBeenCalledWith({
        where: { app_module_id: 1, is_active: true, status: true },
        relations: {
          obj_previous_phase: true,
          obj_reporting_phase: true,
          obj_portfolio: true,
        },
        skip: 0,
        take: 50,
        order: { phase_year: 'DESC', id: 'DESC' },
      });

      expect(result.response.items).toHaveLength(1);
      expect(result.response.page).toBe(1);
      expect(result.response.limit).toBe(50);
      expect(result.response.total).toBe(25);
      expect(result.response.hasNext).toBe(false);
      expect(result.response.totalPages).toBe(1);
      expect(result.statusCode).toBe(HttpStatus.OK);
    });

    it('should support custom pagination parameters', async () => {
      versionRepository.count.mockResolvedValueOnce(100);
      versionRepository.find.mockResolvedValueOnce([
        mockVersion,
        { ...mockVersion, id: 2 },
      ]);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      resultRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      versionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.find(
        ModuleTypeEnum.REPORTING,
        StatusPhaseEnum.OPEN,
        ActiveEnum.ACTIVE,
        2,
        10,
      );

      expect(versionRepository.find).toHaveBeenCalledWith({
        where: { app_module_id: 1, is_active: true, status: true },
        relations: {
          obj_previous_phase: true,
          obj_reporting_phase: true,
          obj_portfolio: true,
        },
        skip: 10,
        take: 10,
        order: { phase_year: 'DESC', id: 'DESC' },
      });

      expect(result.response.page).toBe(2);
      expect(result.response.limit).toBe(10);
      expect(result.response.total).toBe(100);
      expect(result.response.hasNext).toBe(true);
      expect(result.response.totalPages).toBe(10);
    });

    it('should enforce maximum limit of 100', async () => {
      versionRepository.count.mockResolvedValueOnce(200);
      versionRepository.find.mockResolvedValueOnce([mockVersion]);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      resultRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      versionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.find(
        ModuleTypeEnum.REPORTING,
        StatusPhaseEnum.OPEN,
        ActiveEnum.ACTIVE,
        1,
        150, // Requesting 150, should be capped at 100
      );

      expect(versionRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100, // Should be capped at 100
        }),
      );

      expect(result.response.limit).toBe(100);
    });

    it('should calculate can_be_deleted correctly', async () => {
      versionRepository.count.mockResolvedValueOnce(1);
      versionRepository.find.mockResolvedValueOnce([mockVersion]);

      // Mock query builder for versions with results
      const mockResultQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { version_id: 1 }, // Version 1 has results
        ]),
      };

      // Mock query builder for versions as previous phase
      const mockVersionQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      resultRepository.createQueryBuilder.mockReturnValue(
        mockResultQueryBuilder,
      );
      versionRepository.createQueryBuilder.mockReturnValue(
        mockVersionQueryBuilder,
      );

      const result = await service.find(
        ModuleTypeEnum.REPORTING,
        StatusPhaseEnum.OPEN,
        ActiveEnum.ACTIVE,
      );

      expect(result.response.items[0].can_be_deleted).toBe(false); // Has results
    });

    it('should handle IPSR module type', async () => {
      versionRepository.count.mockResolvedValueOnce(5);
      versionRepository.find.mockResolvedValueOnce([mockVersion]);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      resultRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      versionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.find(
        ModuleTypeEnum.IPSR,
        StatusPhaseEnum.OPEN,
        ActiveEnum.ACTIVE,
      );

      expect(versionRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ app_module_id: 2 }),
        }),
      );
    });

    it('should handle CLOSE status', async () => {
      versionRepository.count.mockResolvedValueOnce(3);
      versionRepository.find.mockResolvedValueOnce([mockVersion]);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      resultRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      versionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.find(
        ModuleTypeEnum.REPORTING,
        StatusPhaseEnum.CLOSE,
        ActiveEnum.ACTIVE,
      );

      expect(versionRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: false }),
        }),
      );
    });

    it('should return proper pagination metadata when hasNext is true', async () => {
      versionRepository.count.mockResolvedValueOnce(150);
      versionRepository.find.mockResolvedValueOnce(
        Array(50).fill(mockVersion),
      );

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      resultRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      versionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.find(
        ModuleTypeEnum.REPORTING,
        StatusPhaseEnum.OPEN,
        ActiveEnum.ACTIVE,
        1,
        50,
      );

      expect(result.response.total).toBe(150);
      expect(result.response.hasNext).toBe(true);
      expect(result.response.totalPages).toBe(3);
      expect(result.response.items).toHaveLength(50);
    });

    it('should handle empty results gracefully', async () => {
      versionRepository.count.mockResolvedValueOnce(0);
      versionRepository.find.mockResolvedValueOnce([]);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      resultRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      versionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.find(
        ModuleTypeEnum.REPORTING,
        StatusPhaseEnum.OPEN,
        ActiveEnum.ACTIVE,
      );

      expect(result.response.items).toHaveLength(0);
      expect(result.response.total).toBe(0);
      expect(result.response.hasNext).toBe(false);
      expect(result.response.totalPages).toBe(0);
    });

    it('should handle IPSR module with empty results without SQL syntax error', async () => {
      // Regression test: This scenario caused "IN ()" SQL syntax error
      // when status=open&module=ipsr returned no results
      versionRepository.count.mockResolvedValueOnce(0);
      versionRepository.find.mockResolvedValueOnce([]);

      // When versionIds is empty, queries should NOT be executed
      // to avoid generating invalid "IN ()" SQL
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      resultRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      versionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.find(
        ModuleTypeEnum.IPSR,
        StatusPhaseEnum.OPEN,
        ActiveEnum.ACTIVE,
      );

      // Should return empty results without throwing SQL syntax error
      expect(result.response.items).toHaveLength(0);
      expect(result.response.total).toBe(0);
      
      // Verify that createQueryBuilder was NOT called when versionIds is empty
      // (the guard prevents execution of queries with empty IN clauses)
      expect(resultRepository.createQueryBuilder).not.toHaveBeenCalled();
      expect(versionRepository.createQueryBuilder).not.toHaveBeenCalled();
    });
  });
});
