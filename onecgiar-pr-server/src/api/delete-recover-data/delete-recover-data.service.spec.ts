import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';

import { DeleteRecoverDataService } from './delete-recover-data.service';
import {
  ReturnResponse,
  HandlersError,
} from '../../shared/handlers/error.utils';
import { IpsrRepository } from '../ipsr/ipsr.repository';
import { InnovationPackagingExpertRepository } from '../ipsr/innovation-packaging-experts/repositories/innovation-packaging-expert.repository';
import { ResultIpExpertisesRepository } from '../ipsr/innovation-packaging-experts/repositories/result-ip-expertises.repository';
import { ResultIpAAOutcomeRepository } from '../ipsr/innovation-pathway/repository/result-ip-action-area-outcome.repository';
import { ResultIpEoiOutcomeRepository } from '../ipsr/innovation-pathway/repository/result-ip-eoi-outcomes.repository';
import { ResultIpExpertWorkshopOrganizedRepostory } from '../ipsr/innovation-pathway/repository/result-ip-expert-workshop-organized.repository';
import { ResultIpImpactAreaRepository } from '../ipsr/innovation-pathway/repository/result-ip-impact-area-targets.repository';
import { ResultIpSdgTargetRepository } from '../ipsr/innovation-pathway/repository/result-ip-sdg-targets.repository';
import { ResultInnovationPackageRepository } from '../ipsr/result-innovation-package/repositories/result-innovation-package.repository';
import { ResultIpMeasureRepository } from '../ipsr/result-ip-measures/result-ip-measures.repository';
import { ResultsByIpInnovationUseMeasureRepository } from '../ipsr/results-by-ip-innovation-use-measures/results-by-ip-innovation-use-measure.repository';
import { ResultsComplementaryInnovationRepository } from '../ipsr/results-complementary-innovations/repositories/results-complementary-innovation.repository';
import { ResultsComplementaryInnovationsFunctionRepository } from '../ipsr/results-complementary-innovations-functions/repositories/results-complementary-innovations-function.repository';
import { ResultsInnovationPackagesEnablerTypeRepository } from '../ipsr/results-innovation-packages-enabler-type/repositories/results-innovation-packages-enabler-type.repository';
import { ResultsIpActorRepository } from '../ipsr/results-ip-actors/results-ip-actor.repository';
import { ResultsIpInstitutionTypeRepository } from '../ipsr/results-ip-institution-type/results-ip-institution-type.repository';
import { ResultRepository } from '../results/result.repository';
import { LinkedResultRepository } from '../results/linked-results/linked-results.repository';
import { NonPooledProjectRepository } from '../results/non-pooled-projects/non-pooled-projects.repository';
import { ResultActorRepository } from '../results/result-actors/repositories/result-actors.repository';
import { ResultByInstitutionsByDeliveriesTypeRepository } from '../results/result-by-institutions-by-deliveries-type/result-by-institutions-by-deliveries-type.repository';
import { ResultCountryRepository } from '../results/result-countries/result-countries.repository';
import { ResultAnswerRepository } from '../results/result-questions/repository/result-answers.repository';
import { ResultRegionRepository } from '../results/result-regions/result-regions.repository';
import { ResultsCenterRepository } from '../results/results-centers/results-centers.repository';
import { ResultsImpactAreaIndicatorRepository } from '../results/results-impact-area-indicators/results-impact-area-indicators.repository';
import { ResultsImpactAreaTargetRepository } from '../results/results-impact-area-target/results-impact-area-target.repository';
import { ResultsInvestmentDiscontinuedOptionRepository } from '../results/results-investment-discontinued-options/results-investment-discontinued-options.repository';
import { ResultsKnowledgeProductAltmetricRepository } from '../results/results-knowledge-products/repositories/results-knowledge-product-altmetrics.repository';
import { ResultsKnowledgeProductAuthorRepository } from '../results/results-knowledge-products/repositories/results-knowledge-product-authors.repository';
import { ResultsKnowledgeProductKeywordRepository } from '../results/results-knowledge-products/repositories/results-knowledge-product-keywords.repository';
import { ResultsKnowledgeProductMetadataRepository } from '../results/results-knowledge-products/repositories/results-knowledge-product-metadata.repository';
import { ResultsKnowledgeProductsRepository } from '../results/results-knowledge-products/repositories/results-knowledge-products.repository';
import { ResultsActionAreaOutcomeRepository } from '../results/results-toc-results/repositories/result-toc-action-area.repository';
import { ResultsTocImpactAreaTargetRepository } from '../results/results-toc-results/repositories/result-toc-impact-area-repository';
import { ResultsTocTargetIndicatorRepository } from '../results/results-toc-results/repositories/result-toc-result-target-indicator.repository';
import { ResultsTocSdgTargetRepository } from '../results/results-toc-results/repositories/result-toc-sdg-target-repository';
import { ResultsSdgTargetRepository } from '../results/results-toc-results/repositories/results-sdg-targets.respository';
import { ResultsTocResultIndicatorsRepository } from '../results/results-toc-results/repositories/results-toc-results-indicators.repository';
import { ResultsTocResultRepository } from '../results/results-toc-results/repositories/results-toc-results.repository';
import { resultValidationRepository } from '../results/results-validation-module/results-validation-module.repository';
import { ResultByEvidencesRepository } from '../results/results_by_evidences/result_by_evidences.repository';
import { ResultByInitiativesRepository } from '../results/results_by_inititiatives/resultByInitiatives.repository';
import { ResultByIntitutionsTypeRepository } from '../results/results_by_institution_types/result_by_intitutions_type.repository';
import { ResultByIntitutionsRepository } from '../results/results_by_institutions/result_by_intitutions.repository';
import { ShareResultRequestRepository } from '../results/share-result-request/share-result-request.repository';
import { EvidencesRepository } from '../results/evidences/evidences.repository';
import { ResultsKnowledgeProductFairScoreRepository } from '../results/results-knowledge-products/repositories/results-knowledge-product-fair-scores.repository';
import { ResultsKnowledgeProductInstitutionRepository } from '../results/results-knowledge-products/repositories/results-knowledge-product-institution.repository';
import { ElasticService } from '../../elastic/elastic.service';
import { ResultsService } from '../results/results.service';
import { LogRepository } from '../../connection/dynamodb-logs/dynamodb-logs.repository';
import { ResultTypeEnum } from '../../shared/constants/result-type.enum';
import { ResultLevelEnum } from '../../shared/constants/result-level.enum';
import { EvidenceSharepointRepository } from '../results/evidences/repositories/evidence-sharepoint.repository';
import { KnowledgeProductFairBaselineRepository } from '../results/knowledge_product_fair_baseline/knowledge_product_fair_baseline.repository';
import { ResultCountriesSubNationalRepository } from '../results/result-countries-sub-national/repositories/result-countries-sub-national.repository';
import { NonPooledProjectBudgetRepository } from '../results/result_budget/repositories/non_pooled_proyect_budget.repository';
import { ResultInitiativeBudgetRepository } from '../results/result_budget/repositories/result_initiative_budget.repository';
import { ResultInstitutionsBudgetRepository } from '../results/result_budget/repositories/result_institutions_budget.repository';
import { ResultsCapacityDevelopmentsRepository } from '../results/summary/repositories/results-capacity-developments.repository';
import { ResultsInnovationsDevRepository } from '../results/summary/repositories/results-innovations-dev.repository';
import { ResultsInnovationsUseMeasuresRepository } from '../results/summary/repositories/results-innovations-use-measures.repository';
import { ResultsInnovationsUseRepository } from '../results/summary/repositories/results-innovations-use.repository';
import { ResultsPolicyChangesRepository } from '../results/summary/repositories/results-policy-changes.repository';

describe('DeleteRecoverDataService', () => {
  let service: DeleteRecoverDataService;

  // Helper to create a repo mock with common methods used here
  const repo = () => ({
    logicalDelete: jest.fn().mockResolvedValue(undefined),
    fisicalDelete: jest.fn().mockResolvedValue(undefined),
    fisicalContributorsDelete: jest.fn().mockResolvedValue(undefined),
    fisicalDeleteByTypeAndResultId: jest.fn().mockResolvedValue(undefined),
    changePartnersType: jest.fn().mockResolvedValue(undefined),
    find: jest.fn().mockResolvedValue([]),
    save: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
  });

  const mockIpsrRepository = repo() as any as jest.Mocked<IpsrRepository>;
  const mockInnovationPackagingExpertRepository =
    repo() as any as jest.Mocked<InnovationPackagingExpertRepository>;
  const mockResultIpExpertisesRepository =
    repo() as any as jest.Mocked<ResultIpExpertisesRepository>;
  const mockResultIpAAOutcomeRepository =
    repo() as any as jest.Mocked<ResultIpAAOutcomeRepository>;
  const mockResultIpEoiOutcomeRepository =
    repo() as any as jest.Mocked<ResultIpEoiOutcomeRepository>;
  const mockResultIpExpertWorkshopOrganizedRepostory =
    repo() as any as jest.Mocked<ResultIpExpertWorkshopOrganizedRepostory>;
  const mockResultIpImpactAreaRepository =
    repo() as any as jest.Mocked<ResultIpImpactAreaRepository>;
  const mockResultIpSdgTargetRepository =
    repo() as any as jest.Mocked<ResultIpSdgTargetRepository>;
  const mockResultInnovationPackageRepository =
    repo() as any as jest.Mocked<ResultInnovationPackageRepository>;
  const mockResultIpMeasureRepository =
    repo() as any as jest.Mocked<ResultIpMeasureRepository>;
  const mockResultsByIpInnovationUseMeasureRepository =
    repo() as any as jest.Mocked<ResultsByIpInnovationUseMeasureRepository>;
  const mockResultsComplementaryInnovationRepository =
    repo() as any as jest.Mocked<ResultsComplementaryInnovationRepository>;
  const mockResultsComplementaryInnovationsFunctionRepository =
    repo() as any as jest.Mocked<ResultsComplementaryInnovationsFunctionRepository>;
  const mockResultsInnovationPackagesEnablerTypeRepository =
    repo() as any as jest.Mocked<ResultsInnovationPackagesEnablerTypeRepository>;
  const mockResultsIpActorRepository =
    repo() as any as jest.Mocked<ResultsIpActorRepository>;
  const mockResultsIpInstitutionTypeRepository =
    repo() as any as jest.Mocked<ResultsIpInstitutionTypeRepository>;
  const mockResultRepository = {
    ...repo(),
    findOne: jest.fn(),
  } as any as jest.Mocked<ResultRepository>;
  const mockLinkedResultRepository =
    repo() as any as jest.Mocked<LinkedResultRepository>;
  const mockNonPooledProjectRepository =
    repo() as any as jest.Mocked<NonPooledProjectRepository>;
  const mockResultActorRepository =
    repo() as any as jest.Mocked<ResultActorRepository>;
  const mockResultByInstitutionsByDeliveriesTypeRepository =
    repo() as any as jest.Mocked<ResultByInstitutionsByDeliveriesTypeRepository>;
  const mockResultCountryRepository =
    repo() as any as jest.Mocked<ResultCountryRepository>;
  const mockResultAnswerRepository =
    repo() as any as jest.Mocked<ResultAnswerRepository>;
  const mockResultRegionRepository =
    repo() as any as jest.Mocked<ResultRegionRepository>;
  const mockResultsCenterRepository =
    repo() as any as jest.Mocked<ResultsCenterRepository>;
  const mockResultsImpactAreaIndicatorRepository =
    repo() as any as jest.Mocked<ResultsImpactAreaIndicatorRepository>;
  const mockResultsImpactAreaTargetRepository =
    repo() as any as jest.Mocked<ResultsImpactAreaTargetRepository>;
  const mockResultsInvestmentDiscontinuedOptionRepository =
    repo() as any as jest.Mocked<ResultsInvestmentDiscontinuedOptionRepository>;
  const mockResultsKnowledgeProductAltmetricRepository =
    repo() as any as jest.Mocked<ResultsKnowledgeProductAltmetricRepository>;
  const mockResultsKnowledgeProductAuthorRepository =
    repo() as any as jest.Mocked<ResultsKnowledgeProductAuthorRepository>;
  const mockResultsKnowledgeProductKeywordRepository =
    repo() as any as jest.Mocked<ResultsKnowledgeProductKeywordRepository>;
  const mockResultsKnowledgeProductMetadataRepository =
    repo() as any as jest.Mocked<ResultsKnowledgeProductMetadataRepository>;
  const mockResultsKnowledgeProductsRepository =
    repo() as any as jest.Mocked<ResultsKnowledgeProductsRepository>;
  const mockResultsActionAreaOutcomeRepository =
    repo() as any as jest.Mocked<ResultsActionAreaOutcomeRepository>;
  const mockResultsTocImpactAreaTargetRepository =
    repo() as any as jest.Mocked<ResultsTocImpactAreaTargetRepository>;
  const mockResultsTocTargetIndicatorRepository =
    repo() as any as jest.Mocked<ResultsTocTargetIndicatorRepository>;
  const mockResultsTocSdgTargetRepository =
    repo() as any as jest.Mocked<ResultsTocSdgTargetRepository>;
  const mockResultsSdgTargetRepository =
    repo() as any as jest.Mocked<ResultsSdgTargetRepository>;
  const mockResultsTocResultIndicatorsRepository =
    repo() as any as jest.Mocked<ResultsTocResultIndicatorsRepository>;
  const mockResultsTocResultRepository =
    repo() as any as jest.Mocked<ResultsTocResultRepository>;
  const mockResultValidationRepository =
    repo() as any as jest.Mocked<resultValidationRepository>;
  const mockResultByEvidencesRepository =
    repo() as any as jest.Mocked<ResultByEvidencesRepository>;
  const mockResultByInitiativesRepository =
    repo() as any as jest.Mocked<ResultByInitiativesRepository>;
  const mockResultByIntitutionsTypeRepository =
    repo() as any as jest.Mocked<ResultByIntitutionsTypeRepository>;
  const mockResultByIntitutionsRepository =
    repo() as any as jest.Mocked<ResultByIntitutionsRepository>;
  const mockResultsCapacityDevelopmentsRepository =
    repo() as any as jest.Mocked<ResultsCapacityDevelopmentsRepository>;
  const mockResultsInnovationsDevRepository =
    repo() as any as jest.Mocked<ResultsInnovationsDevRepository>;
  const mockResultsInnovationsUseMeasuresRepository =
    repo() as any as jest.Mocked<ResultsInnovationsUseMeasuresRepository>;
  const mockResultsInnovationsUseRepository =
    repo() as any as jest.Mocked<ResultsInnovationsUseRepository>;
  const mockResultsPolicyChangesRepository =
    repo() as any as jest.Mocked<ResultsPolicyChangesRepository>;
  const mockShareResultRequestRepository =
    repo() as any as jest.Mocked<ShareResultRequestRepository>;
  const mockEvidencesRepository =
    repo() as any as jest.Mocked<EvidencesRepository>;
  const mockResultsKnowledgeProductFairScoreRepository =
    repo() as any as jest.Mocked<ResultsKnowledgeProductFairScoreRepository>;
  const mockResultsKnowledgeProductInstitutionRepository =
    repo() as any as jest.Mocked<ResultsKnowledgeProductInstitutionRepository>;
  const mockEvidenceSharepointRepository =
    repo() as any as jest.Mocked<EvidenceSharepointRepository>;
  const mockResultInstitutionsBudgetRepository =
    repo() as any as jest.Mocked<ResultInstitutionsBudgetRepository>;
  const mockNonPooledProjectBudgetRepository =
    repo() as any as jest.Mocked<NonPooledProjectBudgetRepository>;
  const mockResultInitiativeBudgetRepository =
    repo() as any as jest.Mocked<ResultInitiativeBudgetRepository>;
  const mockResultCountriesSubNationalRepository =
    repo() as any as jest.Mocked<ResultCountriesSubNationalRepository>;
  const mockKnowledgeProductFairBaselineRepository =
    repo() as any as jest.Mocked<KnowledgeProductFairBaselineRepository>;
  const mockElasticService = {
    getBulkElasticOperationResults: jest.fn().mockReturnValue('{}'),
    sendBulkOperationToElastic: jest.fn().mockResolvedValue(undefined),
  } as any as jest.Mocked<ElasticService>;
  const mockResultsService = {
    findAllSimplified: jest
      .fn()
      .mockResolvedValue({ status: HttpStatus.OK, response: [{}] }),
  } as any as jest.Mocked<ResultsService>;
  const mockLogRepository = {
    createLog: jest.fn().mockResolvedValue(undefined),
  } as any as jest.Mocked<LogRepository>;

  const providers = [
    DeleteRecoverDataService,
    ReturnResponse,
    HandlersError,
    { provide: IpsrRepository, useValue: mockIpsrRepository },
    {
      provide: InnovationPackagingExpertRepository,
      useValue: mockInnovationPackagingExpertRepository,
    },
    {
      provide: ResultIpExpertisesRepository,
      useValue: mockResultIpExpertisesRepository,
    },
    {
      provide: ResultIpAAOutcomeRepository,
      useValue: mockResultIpAAOutcomeRepository,
    },
    {
      provide: ResultIpEoiOutcomeRepository,
      useValue: mockResultIpEoiOutcomeRepository,
    },
    {
      provide: ResultIpExpertWorkshopOrganizedRepostory,
      useValue: mockResultIpExpertWorkshopOrganizedRepostory,
    },
    {
      provide: ResultIpImpactAreaRepository,
      useValue: mockResultIpImpactAreaRepository,
    },
    {
      provide: ResultIpSdgTargetRepository,
      useValue: mockResultIpSdgTargetRepository,
    },
    {
      provide: ResultInnovationPackageRepository,
      useValue: mockResultInnovationPackageRepository,
    },
    {
      provide: ResultIpMeasureRepository,
      useValue: mockResultIpMeasureRepository,
    },
    {
      provide: ResultsByIpInnovationUseMeasureRepository,
      useValue: mockResultsByIpInnovationUseMeasureRepository,
    },
    {
      provide: ResultsComplementaryInnovationRepository,
      useValue: mockResultsComplementaryInnovationRepository,
    },
    {
      provide: ResultsComplementaryInnovationsFunctionRepository,
      useValue: mockResultsComplementaryInnovationsFunctionRepository,
    },
    {
      provide: ResultsInnovationPackagesEnablerTypeRepository,
      useValue: mockResultsInnovationPackagesEnablerTypeRepository,
    },
    {
      provide: ResultsIpActorRepository,
      useValue: mockResultsIpActorRepository,
    },
    {
      provide: ResultsIpInstitutionTypeRepository,
      useValue: mockResultsIpInstitutionTypeRepository,
    },
    { provide: ResultRepository, useValue: mockResultRepository },
    { provide: LinkedResultRepository, useValue: mockLinkedResultRepository },
    {
      provide: NonPooledProjectRepository,
      useValue: mockNonPooledProjectRepository,
    },
    { provide: ResultActorRepository, useValue: mockResultActorRepository },
    {
      provide: ResultByInstitutionsByDeliveriesTypeRepository,
      useValue: mockResultByInstitutionsByDeliveriesTypeRepository,
    },
    { provide: ResultCountryRepository, useValue: mockResultCountryRepository },
    { provide: ResultAnswerRepository, useValue: mockResultAnswerRepository },
    { provide: ResultRegionRepository, useValue: mockResultRegionRepository },
    { provide: ResultsCenterRepository, useValue: mockResultsCenterRepository },
    {
      provide: ResultsImpactAreaIndicatorRepository,
      useValue: mockResultsImpactAreaIndicatorRepository,
    },
    {
      provide: ResultsImpactAreaTargetRepository,
      useValue: mockResultsImpactAreaTargetRepository,
    },
    {
      provide: ResultsInvestmentDiscontinuedOptionRepository,
      useValue: mockResultsInvestmentDiscontinuedOptionRepository,
    },
    {
      provide: ResultsKnowledgeProductAltmetricRepository,
      useValue: mockResultsKnowledgeProductAltmetricRepository,
    },
    {
      provide: ResultsKnowledgeProductAuthorRepository,
      useValue: mockResultsKnowledgeProductAuthorRepository,
    },
    {
      provide: ResultsKnowledgeProductKeywordRepository,
      useValue: mockResultsKnowledgeProductKeywordRepository,
    },
    {
      provide: ResultsKnowledgeProductMetadataRepository,
      useValue: mockResultsKnowledgeProductMetadataRepository,
    },
    {
      provide: ResultsKnowledgeProductsRepository,
      useValue: mockResultsKnowledgeProductsRepository,
    },
    {
      provide: ResultsActionAreaOutcomeRepository,
      useValue: mockResultsActionAreaOutcomeRepository,
    },
    {
      provide: ResultsTocImpactAreaTargetRepository,
      useValue: mockResultsTocImpactAreaTargetRepository,
    },
    {
      provide: ResultsTocTargetIndicatorRepository,
      useValue: mockResultsTocTargetIndicatorRepository,
    },
    {
      provide: ResultsTocSdgTargetRepository,
      useValue: mockResultsTocSdgTargetRepository,
    },
    {
      provide: ResultsSdgTargetRepository,
      useValue: mockResultsSdgTargetRepository,
    },
    {
      provide: ResultsTocResultIndicatorsRepository,
      useValue: mockResultsTocResultIndicatorsRepository,
    },
    {
      provide: ResultsTocResultRepository,
      useValue: mockResultsTocResultRepository,
    },
    {
      provide: resultValidationRepository,
      useValue: mockResultValidationRepository,
    },
    {
      provide: ResultByEvidencesRepository,
      useValue: mockResultByEvidencesRepository,
    },
    {
      provide: ResultByInitiativesRepository,
      useValue: mockResultByInitiativesRepository,
    },
    {
      provide: ResultByIntitutionsTypeRepository,
      useValue: mockResultByIntitutionsTypeRepository,
    },
    {
      provide: ResultByIntitutionsRepository,
      useValue: mockResultByIntitutionsRepository,
    },
    {
      provide: ResultsCapacityDevelopmentsRepository,
      useValue: mockResultsCapacityDevelopmentsRepository,
    },
    {
      provide: ResultsInnovationsDevRepository,
      useValue: mockResultsInnovationsDevRepository,
    },
    {
      provide: ResultsInnovationsUseMeasuresRepository,
      useValue: mockResultsInnovationsUseMeasuresRepository,
    },
    {
      provide: ResultsInnovationsUseRepository,
      useValue: mockResultsInnovationsUseRepository,
    },
    {
      provide: ResultsPolicyChangesRepository,
      useValue: mockResultsPolicyChangesRepository,
    },
    {
      provide: ShareResultRequestRepository,
      useValue: mockShareResultRequestRepository,
    },
    { provide: EvidencesRepository, useValue: mockEvidencesRepository },
    {
      provide: ResultsKnowledgeProductFairScoreRepository,
      useValue: mockResultsKnowledgeProductFairScoreRepository,
    },
    {
      provide: ResultsKnowledgeProductInstitutionRepository,
      useValue: mockResultsKnowledgeProductInstitutionRepository,
    },
    {
      provide: EvidenceSharepointRepository,
      useValue: mockEvidenceSharepointRepository,
    },
    {
      provide: ResultInstitutionsBudgetRepository,
      useValue: mockResultInstitutionsBudgetRepository,
    },
    {
      provide: NonPooledProjectBudgetRepository,
      useValue: mockNonPooledProjectBudgetRepository,
    },
    {
      provide: ResultInitiativeBudgetRepository,
      useValue: mockResultInitiativeBudgetRepository,
    },
    {
      provide: ResultCountriesSubNationalRepository,
      useValue: mockResultCountriesSubNationalRepository,
    },
    {
      provide: KnowledgeProductFairBaselineRepository,
      useValue: mockKnowledgeProductFairBaselineRepository,
    },
    { provide: ElasticService, useValue: mockElasticService },
    { provide: ResultsService, useValue: mockResultsService },
    { provide: LogRepository, useValue: mockLogRepository },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers,
    }).compile();

    service = module.get(DeleteRecoverDataService);
    jest.clearAllMocks();
  });

  describe('deleteResult', () => {
    const user = { id: 1 } as any;

    it('returns NOT_FOUND when result does not exist', async () => {
      (mockResultRepository.findOne as jest.Mock).mockResolvedValueOnce(null);
      const res = await service.deleteResult(99, user);
      expect(res.statusCode).toBe(HttpStatus.NOT_FOUND);
      expect(res.message).toBe('Result not found');
    });

    it('returns BAD_REQUEST when result is QA assessed', async () => {
      (mockResultRepository.findOne as jest.Mock).mockResolvedValueOnce({
        id: 10,
        status_id: 2,
      });
      const res = await service.deleteResult(10, user);
      expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
      expect(res.message).toBe('Is already Quality Assessed');
    });

    it('deletes result and related entities, updates elastic and logs', async () => {
      (mockResultRepository.findOne as jest.Mock).mockResolvedValueOnce({
        id: 10,
        status_id: 1,
        result_code: 1234,
      });
      const res = await service.deleteResult(10, user);
      expect(res.statusCode).toBe(HttpStatus.OK);
      expect(mockIpsrRepository.logicalDelete).toHaveBeenCalledWith(10);
      expect(mockResultsService.findAllSimplified).toHaveBeenCalledWith(
        '10',
        true,
      );
      expect(
        mockElasticService.getBulkElasticOperationResults,
      ).toHaveBeenCalled();
      expect(mockElasticService.sendBulkOperationToElastic).toHaveBeenCalled();
      expect(mockLogRepository.createLog).toHaveBeenCalled();
    });
  });

  describe('changeResultType', () => {
    const user = { id: 1 } as any;

    it('validates required fields', async () => {
      const res = await service.changeResultType(0, 0, 0, '', user);
      expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
    });

    it('returns NOT_FOUND when result missing', async () => {
      (mockResultRepository.findOne as jest.Mock).mockResolvedValueOnce(null);
      const res = await service.changeResultType(1, 1, 1, 'why', user);
      expect(res.statusCode).toBe(HttpStatus.NOT_FOUND);
    });

    it('blocks knowledge product change from endpoint', async () => {
      (mockResultRepository.findOne as jest.Mock).mockResolvedValueOnce({
        id: 2,
        title: 'x',
      });
      const res = await service.changeResultType(
        2,
        1,
        ResultTypeEnum.KNOWLEDGE_PRODUCT,
        'why',
        user,
        true,
      );
      expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
    });

    it('updates result type and triggers data management and elastic when new_name provided', async () => {
      (mockResultRepository.findOne as jest.Mock).mockResolvedValueOnce({
        id: 3,
        title: 'Old',
        result_code: 77,
        version_id: 1,
        result_type_id: ResultTypeEnum.OTHER_OUTPUT,
        result_level_id: ResultLevelEnum.INITIATIVE_OUTPUT,
      });
      // Spy and mock internal method manageChangedResultTypeData
      const spyManage = jest
        .spyOn(service, 'manageChangedResultTypeData')
        .mockResolvedValue({
          statusCode: HttpStatus.OK,
          response: {},
          message: 'ok',
        });

      const res = await service.changeResultType(
        3,
        2,
        4,
        'why',
        user,
        true,
        'New Title',
      );
      expect(res.statusCode).toBe(HttpStatus.OK);
      expect(mockResultRepository.update).toHaveBeenCalled();
      expect(spyManage).toHaveBeenCalled();
      expect(mockResultsService.findAllSimplified).toHaveBeenCalledWith('3');
      expect(mockElasticService.sendBulkOperationToElastic).toHaveBeenCalled();
    });
  });

  describe('manageChangedResultTypeData', () => {
    const resultBase = {
      id: 9,
      result_code: 999,
      result_type_id: ResultTypeEnum.OTHER_OUTPUT,
      result_level_id: ResultLevelEnum.INITIATIVE_OUTPUT,
    } as any;
    const user = { id: 1 } as any;

    it('returns OK when delete and migrate succeed', async () => {
      jest.spyOn(service, 'deleteDataByNewResultType').mockResolvedValue({
        statusCode: HttpStatus.OK,
        response: 9,
        message: 'd',
      } as any);
      jest.spyOn(service, 'migrateDataByNewResultType').mockResolvedValue({
        statusCode: HttpStatus.OK,
        response: 9,
        message: 'm',
      } as any);
      const res = await service.manageChangedResultTypeData(
        resultBase,
        ResultLevelEnum.INITIATIVE_OUTCOME,
        ResultTypeEnum.POLICY_CHANGE,
        user,
      );
      expect(res.statusCode).toBe(HttpStatus.OK);
      expect(res.message).toContain('has been changed');
    });

    it('returns error-like response when delete fails', async () => {
      jest.spyOn(service, 'deleteDataByNewResultType').mockResolvedValue({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        response: 9,
        message: 'bad',
      } as any);
      const res = await service.manageChangedResultTypeData(
        resultBase,
        ResultLevelEnum.INITIATIVE_OUTCOME,
        ResultTypeEnum.POLICY_CHANGE,
        user,
      );
      expect(res.message).toContain('deleting had an error');
    });
  });
});
