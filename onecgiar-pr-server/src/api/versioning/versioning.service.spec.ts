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
import { BilateralVersioningRulesService } from '../bilateral/versioning-rules/bilateral-versioning-rules.service';
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
import { AppModuleIdEnum } from 'src/shared/constants/role-type.enum';

describe('VersioningService', () => {
  let service: VersioningService;
  let testingModule: TestingModule;
  let resultRepository;
  let versionRepository;

  const muckResult = new Result();
  muckResult.id = 3;
  muckResult.result_code = 3;
  muckResult.result_type_id = 5;
  muckResult.version_id = 2;

  beforeEach(async () => {
    testingModule = await Test.createTestingModule({
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
        {
          provide: ResultByInitiativesRepository,
          useValue: {
            getOwnerInitiativeByResult: jest.fn().mockResolvedValue({
              inititiative_id: 100,
            }),
            replicate: jest.fn().mockResolvedValue([]),
          },
        },
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
        BilateralVersioningRulesService,
        ResultsTocResultIndicatorsRepository,
        ResultsTocSdgTargetRepository,
        ResultsTocImpactAreaTargetRepository,
        ResultsSdgTargetRepository,
        ResultStatusRepository,
        ResultsActionAreaOutcomeRepository,
        ResultsTocTargetIndicatorRepository,
        {
          provide: ResultInitiativeBudgetRepository,
          useValue: {
            replicate: jest.fn().mockResolvedValue([]),
            ensureMissingBudgetsForPrimaryInitiatives: jest
              .fn()
              .mockResolvedValue(undefined),
          },
        },
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
        {
          provide: ClarisaInitiativesRepository,
          useValue: {
            findOne: jest.fn().mockResolvedValue({ portfolio_id: 1 }),
          },
        },
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
            find: jest.fn().mockResolvedValue([]),
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
                query: jest.fn().mockResolvedValue([]),
                update: jest.fn().mockResolvedValue({}),
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

    service = testingModule.get<VersioningService>(VersioningService);

    resultRepository = testingModule.get<ResultRepository>(ResultRepository);
    versionRepository = testingModule.get<VersionRepository>(VersionRepository);
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

  // P2-3229. A bilateral result carried forward from the reporting tool answers to the
  // bilateral rules and to the lead centre, not to the pool-funding rules. The gate sits in
  // versionProcessV2 rather than in the UI because the menu that hides the action is UX and
  // cannot be trusted to enforce anything.
  describe('bilateral gate (P2-3229)', () => {
    const bilateralResult = (overrides: any = {}) => ({
      id: 31921,
      result_code: 28565,
      result_type_id: 5,
      version_id: 6,
      is_active: true,
      source: 'API',
      obj_result_by_initiatives: [
        { initiative_id: 51, initiative_role_id: 1, is_active: true },
      ],
      ...overrides,
    });

    const rulesStub = () =>
      testingModule.get<BilateralVersioningRulesService>(
        BilateralVersioningRulesService,
      );

    const armRules = (leadCenter: string | null = 'CENTER-02') => {
      const rules = rulesStub() as any;
      rules.getActiveReportingPhase = jest.fn(async () => ({ id: 7 }));
      rules.resolveVersionableResult = jest.fn(async () => bilateralResult());
      rules.resolveLeadCenterCode = jest.fn(async () => leadCenter);
      return rules;
    };

    const armRoles = (roles: any[]) => {
      const repo = testingModule.get<RoleByUserRepository>(
        RoleByUserRepository,
      ) as any;
      repo.getAllRolesByUser = jest.fn(async () => roles);
      return repo;
    };

    it('refuses a user who does not belong to the lead centre', async () => {
      armRules('CENTER-02');
      armRoles([{ role_id: 9, center_id: 'CENTER-11' }]);
      const clarisa = testingModule.get<ClarisaInitiativesRepository>(
        ClarisaInitiativesRepository,
      );
      (clarisa.findOne as jest.Mock).mockResolvedValue({
        id: 51,
        portfolio_id: 3,
        active: true,
      });
      resultRepository.findOne.mockResolvedValueOnce(bilateralResult() as any);

      await expect(
        service.versionProcessV2(31921, 51, { id: 5 } as any),
      ).rejects.toMatchObject({
        message: expect.stringContaining('CENTER-02'),
      });
    });

    it('refuses when the result has no lead centre — nobody can claim it', async () => {
      armRules(null);
      armRoles([{ role_id: 9, center_id: 'CENTER-02' }]);
      const clarisa = testingModule.get<ClarisaInitiativesRepository>(
        ClarisaInitiativesRepository,
      );
      (clarisa.findOne as jest.Mock).mockResolvedValue({
        id: 51,
        portfolio_id: 3,
        active: true,
      });
      resultRepository.findOne.mockResolvedValueOnce(bilateralResult() as any);

      await expect(
        service.versionProcessV2(31921, 51, { id: 5 } as any),
      ).rejects.toMatchObject({
        message: expect.stringContaining('no lead centre'),
      });
    });

    it('defers eligibility to the shared rules rather than restating them', async () => {
      const rules = armRules('CENTER-02');
      armRoles([{ role_id: 9, center_id: 'CENTER-02' }]);
      const clarisa = testingModule.get<ClarisaInitiativesRepository>(
        ClarisaInitiativesRepository,
      );
      (clarisa.findOne as jest.Mock).mockResolvedValue({
        id: 51,
        portfolio_id: 3,
        active: true,
      });
      resultRepository.findOne.mockResolvedValueOnce(bilateralResult() as any);

      await service
        .versionProcessV2(31921, 51, { id: 5 } as any)
        .catch(() => undefined);

      expect(rules.resolveVersionableResult).toHaveBeenCalledWith('28565', 7);
    });

    it('leaves a W1/W2 result alone — the gate only applies to bilaterals', async () => {
      const rules = armRules('CENTER-02');
      armRoles([]);
      const clarisa = testingModule.get<ClarisaInitiativesRepository>(
        ClarisaInitiativesRepository,
      );
      (clarisa.findOne as jest.Mock).mockResolvedValue({
        id: 51,
        portfolio_id: 3,
        active: true,
      });
      resultRepository.findOne.mockResolvedValueOnce(
        bilateralResult({ source: 'Result' }) as any,
      );

      await service
        .versionProcessV2(31921, 51, { id: 5 } as any)
        .catch(() => undefined);

      expect(rules.resolveVersionableResult).not.toHaveBeenCalled();
    });
  });

  it('should require V2 when primary submitter is already P25 (portfolio 3)', async () => {
    const rbi = testingModule.get<ResultByInitiativesRepository>(
      ResultByInitiativesRepository,
    );
    const clarisa = testingModule.get<ClarisaInitiativesRepository>(
      ClarisaInitiativesRepository,
    );
    (rbi.getOwnerInitiativeByResult as jest.Mock).mockResolvedValueOnce({
      inititiative_id: 200,
    });
    (clarisa.findOne as jest.Mock).mockResolvedValueOnce({
      portfolio_id: 3,
    });
    resultRepository.findOne.mockResolvedValueOnce({
      id: 3,
      result_code: 3,
      result_type_id: 5,
      version_id: 2,
    } as any);
    await expect(service.versionProcess(3, {} as any)).rejects.toEqual(
      ReturnResponseUtil.format({
        message: `Results whose primary submitter is already a P25 CGIAR Program must use phase change with entityId (V2).`,
        response: 3,
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
  /**
   * P2-3420 / P2-3421 — the dropdown must offer the PREVIOUS reporting phase, singular. Ángel Jarrín
   * closed the scope on 31-Aug-2026 asking for the rule to "remain generic and always refer to the
   * previous reporting phase", so this resolver reads `version.previous_phase` and only falls back to
   * `openYear - 1` when that link is missing. A hardcoded year here is the failure mode these tests
   * exist to catch.
   */
  describe('$_findPreviousPhaseYear (P2-3420 / P2-3421)', () => {
    it('follows previous_phase and returns that phase year', async () => {
      const findOne = jest
        .fn()
        .mockResolvedValueOnce({ id: 36, phase_year: 2026, previous_phase: 12 })
        .mockResolvedValueOnce({ id: 12, phase_year: 2025 });
      (service as any)._versionRepository = { findOne };

      const year = await service.$_findPreviousPhaseYear(
        AppModuleIdEnum.REPORTING,
      );

      expect(year).toBe(2025);
      expect(findOne).toHaveBeenNthCalledWith(2, { where: { id: 12 } });
    });

    it('does not assume the previous phase is one calendar year back', async () => {
      // A phase link that skips a year must be honoured, not "corrected" to openYear - 1.
      const findOne = jest
        .fn()
        .mockResolvedValueOnce({ id: 40, phase_year: 2026, previous_phase: 9 })
        .mockResolvedValueOnce({ id: 9, phase_year: 2023 });
      (service as any)._versionRepository = { findOne };

      await expect(
        service.$_findPreviousPhaseYear(AppModuleIdEnum.REPORTING),
      ).resolves.toBe(2023);
    });

    it('falls back to the year before the open phase when there is no previous_phase link', async () => {
      const findOne = jest.fn().mockResolvedValueOnce({
        id: 36,
        phase_year: 2026,
        previous_phase: null,
      });
      (service as any)._versionRepository = { findOne };

      await expect(
        service.$_findPreviousPhaseYear(AppModuleIdEnum.REPORTING),
      ).resolves.toBe(2025);
      expect(findOne).toHaveBeenCalledTimes(1);
    });

    it('falls back when the linked previous phase carries no usable year', async () => {
      const findOne = jest
        .fn()
        .mockResolvedValueOnce({ id: 36, phase_year: 2026, previous_phase: 12 })
        .mockResolvedValueOnce({ id: 12, phase_year: null });
      (service as any)._versionRepository = { findOne };

      await expect(
        service.$_findPreviousPhaseYear(AppModuleIdEnum.REPORTING),
      ).resolves.toBe(2025);
    });

    it('returns null when there is no open reporting phase at all', async () => {
      const findOne = jest.fn().mockResolvedValueOnce(null);
      (service as any)._versionRepository = { findOne };

      await expect(
        service.$_findPreviousPhaseYear(AppModuleIdEnum.REPORTING),
      ).resolves.toBeNull();
    });
  });

  describe('$_refreshIpsrTitleFromCoreInnovation', () => {
    const buildManager = (overrides: {
      coreLink?: { result_id: number } | null;
      coreInnovation?: { title: string } | null;
      regions?: any[];
      countries?: any[];
      update?: jest.Mock;
    }) => {
      return {
        getRepository: jest.fn((entity: any) => {
          switch (entity?.name) {
            case 'Ipsr':
              return {
                findOne: jest
                  .fn()
                  .mockResolvedValue(overrides.coreLink ?? null),
              };
            case 'Result':
              return {
                findOne: jest
                  .fn()
                  .mockResolvedValue(overrides.coreInnovation ?? null),
              };
            case 'ResultRegion':
              return {
                find: jest.fn().mockResolvedValue(overrides.regions ?? []),
              };
            case 'ResultCountry':
              return {
                find: jest.fn().mockResolvedValue(overrides.countries ?? []),
              };
            default:
              throw new Error(`Unexpected repository: ${entity?.name}`);
          }
        }),
        update: overrides.update ?? jest.fn(),
      } as any;
    };

    const call = (manager: any, result: any, previousCoreId: number) =>
      (service as any).$_refreshIpsrTitleFromCoreInnovation(
        manager,
        result,
        previousCoreId,
        { id: 601 } as any,
      );

    it('does nothing when the core innovation link did not move', async () => {
      const update = jest.fn();
      const manager = buildManager({ coreLink: { result_id: 900 }, update });

      await call(manager, { id: 10, geographic_scope_id: 1 }, 900);

      expect(update).not.toHaveBeenCalled();
    });

    it('does nothing when there is no active core innovation link', async () => {
      const update = jest.fn();
      const manager = buildManager({ coreLink: null, update });

      await call(manager, { id: 10, geographic_scope_id: 1 }, 900);

      expect(update).not.toHaveBeenCalled();
    });

    it('rebuilds the title from the new core innovation for a global package', async () => {
      const update = jest.fn();
      const manager = buildManager({
        coreLink: { result_id: 901 },
        coreInnovation: { title: 'Drought Tolerant Maize' },
        update,
      });
      const newResult: any = {
        id: 10,
        geographic_scope_id: 1,
        title: 'old title',
      };

      await call(manager, newResult, 900);

      expect(update).toHaveBeenCalledTimes(1);
      const [, criteria, patch] = update.mock.calls[0];
      expect(criteria).toEqual({ id: 10 });
      expect(patch.title).toBe(
        'Innovation Package and Scaling Readiness assessment for drought tolerant maize.',
      );
      expect(patch.last_updated_by).toBe(601);
      expect(newResult.title).toBe(patch.title);
    });

    it('lists the replicated countries in the rebuilt title', async () => {
      const update = jest.fn();
      const manager = buildManager({
        coreLink: { result_id: 901 },
        coreInnovation: { title: 'Drought Tolerant Maize' },
        countries: [
          { country_object: { name: 'Morocco' } },
          { country_object: { name: 'Peru' } },
        ],
        update,
      });

      await call(
        manager,
        { id: 10, geographic_scope_id: 3, title: 'old title' },
        900,
      );

      const [, , patch] = update.mock.calls[0];
      expect(patch.title).toBe(
        'Innovation Package and Scaling Readiness assessment for drought tolerant maize in Morocco and Peru',
      );
    });

    it('does not write when the rebuilt title matches the current one', async () => {
      const update = jest.fn();
      const manager = buildManager({
        coreLink: { result_id: 901 },
        coreInnovation: { title: 'Drought Tolerant Maize' },
        update,
      });

      await call(
        manager,
        {
          id: 10,
          geographic_scope_id: 1,
          title:
            'Innovation Package and Scaling Readiness assessment for drought tolerant maize.',
        },
        900,
      );

      expect(update).not.toHaveBeenCalled();
    });
  });
  /**
   * The result-detail screen calls this when the code/phase pair in the URL has no row, so it can
   * name the years in which the result DOES exist. An empty version list must never reach
   * `In([])` — TypeORM would emit `IN (NULL)` and the intent would be lost in the log.
   */
  describe('getVersionsOfAResultCode', () => {
    it('returns the phases the code lives in', async () => {
      const phases = [
        { id: 34, phase_name: 'Reporting 2025' },
        { id: 36, phase_name: 'Reporting 2026' },
      ];
      const $_getVersionsOfAResultCode = jest.fn().mockResolvedValue([34, 36]);
      const find = jest.fn().mockResolvedValue(phases);
      (service as any)._versionRepository = {
        $_getVersionsOfAResultCode,
        find,
      };

      const res = await service.getVersionsOfAResultCode(6432);

      expect($_getVersionsOfAResultCode).toHaveBeenCalledWith(6432);
      expect(res.response).toEqual(phases);
      expect(res.statusCode).toBe(HttpStatus.OK);
    });

    it('answers an empty list without querying for the phases', async () => {
      const find = jest.fn();
      (service as any)._versionRepository = {
        $_getVersionsOfAResultCode: jest.fn().mockResolvedValue([]),
        find,
      };

      const res = await service.getVersionsOfAResultCode(999999);

      expect(find).not.toHaveBeenCalled();
      expect(res.response).toEqual([]);
      expect(res.statusCode).toBe(HttpStatus.OK);
    });
  });
});
