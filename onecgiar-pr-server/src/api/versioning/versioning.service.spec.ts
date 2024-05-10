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
import { ResultsTocResultRepository } from '../results/results-toc-results/results-toc-results.repository';
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
import { ResultsTocSdgTargetRepository } from '../results/results-toc-results/repositories/result-toc-sdg-target-repository';
import { ResultsTocImpactAreaTargetRepository } from '../results/results-toc-results/repositories/result-toc-impact-area-repository';
import { ResultsSdgTargetRepository } from '../results/results-toc-results/repositories/results-sdg-targets.respository';
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
import { ResultTypeRepository } from '../results/result_types/resultType.repository';
import { ResultsTocResultIndicatorsService } from '../results/results-toc-results/results-toc-result-indicators.service';

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
        ResultTypeRepository,
        ResultsTocResultIndicatorsService,
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
          },
        },
        {
          provide: VersionRepository,
          useValue: {
            findOne: jest.fn(),
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
      imports: [HttpModule],
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
});
