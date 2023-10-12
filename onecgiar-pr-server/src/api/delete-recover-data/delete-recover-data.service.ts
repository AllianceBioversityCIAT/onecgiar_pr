import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ReturnResponse } from '../../shared/handlers/error.utils';

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
import { ResultsActionAreaOutcomeRepository } from '../results/results-toc-results/result-toc-action-area.repository';
import { ResultsTocImpactAreaTargetRepository } from '../results/results-toc-results/result-toc-impact-area-repository';
import { ResultsTocTargetIndicatorRepository } from '../results/results-toc-results/result-toc-result-target-indicator.repository';
import { ResultsTocSdgTargetRepository } from '../results/results-toc-results/result-toc-sdg-target-repository';
import { ResultsSdgTargetRepository } from '../results/results-toc-results/results-sdg-targets.respository';
import { ResultsTocResultIndicatorsRepository } from '../results/results-toc-results/results-toc-results-indicators.repository';
import { ResultsTocResultRepository } from '../results/results-toc-results/results-toc-results.repository';
import { resultValidationRepository } from '../results/results-validation-module/results-validation-module.repository';
import { ResultByEvidencesRepository } from '../results/results_by_evidences/result_by_evidences.repository';
import { ResultByInitiativesRepository } from '../results/results_by_inititiatives/resultByInitiatives.repository';
import { ResultByIntitutionsTypeRepository } from '../results/results_by_institution_types/result_by_intitutions_type.repository';
import { ResultByIntitutionsRepository } from '../results/results_by_institutions/result_by_intitutions.repository';
import { ResultsCapacityDevelopmentsRepository } from '../results/summary/repositories/results-capacity-developments.repository';
import { ResultsInnovationsDevRepository } from '../results/summary/repositories/results-innovations-dev.repository';
import { ResultsInnovationsUseMeasuresRepository } from '../results/summary/repositories/results-innovations-use-measures.repository';
import { ResultsInnovationsUseRepository } from '../results/summary/repositories/results-innovations-use.repository';
import { ResultsPolicyChangesRepository } from '../results/summary/repositories/results-policy-changes.repository';
import { env } from 'process';
import { ShareResultRequestRepository } from '../results/share-result-request/share-result-request.repository';
import { EvidencesRepository } from '../results/evidences/evidences.repository';
import { ResultsKnowledgeProductFairScoreRepository } from '../results/results-knowledge-products/repositories/results-knowledge-product-fair-scores.repository';
import { ResultsKnowledgeProductInstitutionRepository } from '../results/results-knowledge-products/repositories/results-knowledge-product-institution.repository';
import { ElasticService } from '../../elastic/elastic.service';
import { ResultsService } from '../results/results.service';
import { ElasticOperationDto } from '../../elastic/dto/elastic-operation.dto';
import { LogRepository } from '../../connection/dynamodb-logs/dynamodb-logs.repository';
import { Actions } from '../../connection/dynamodb-logs/dto/enumAction.const';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';

@Injectable()
export class DeleteRecoverDataService {
  private readonly _logger = new Logger(DeleteRecoverDataService.name);
  constructor(
    private readonly _returnResponse: ReturnResponse,
    private readonly _ipsrRepository: IpsrRepository,
    private readonly _innovationPackagingExpertRepository: InnovationPackagingExpertRepository,
    private readonly _resultIpExpertisesRepository: ResultIpExpertisesRepository,
    private readonly _resultIpAAOutcomeRepository: ResultIpAAOutcomeRepository,
    private readonly _resultIpEoiOutcomeRepository: ResultIpEoiOutcomeRepository,
    private readonly _resultIpExpertWorkshopOrganizedRepostory: ResultIpExpertWorkshopOrganizedRepostory,
    private readonly _resultIpImpactAreaRepository: ResultIpImpactAreaRepository,
    private readonly _resultIpSdgTargetRepository: ResultIpSdgTargetRepository,
    private readonly _resultInnovationPackageRepository: ResultInnovationPackageRepository,
    private readonly _resultIpMeasureRepository: ResultIpMeasureRepository,
    private readonly _resultsByIpInnovationUseMeasureRepository: ResultsByIpInnovationUseMeasureRepository,
    private readonly _resultsComplementaryInnovationRepository: ResultsComplementaryInnovationRepository,
    private readonly _resultsComplementaryInnovationsFunctionRepository: ResultsComplementaryInnovationsFunctionRepository,
    private readonly _resultsInnovationPackagesEnablerTypeRepository: ResultsInnovationPackagesEnablerTypeRepository,
    private readonly _resultsIpActorRepository: ResultsIpActorRepository,
    private readonly _resultsIpInstitutionTypeRepository: ResultsIpInstitutionTypeRepository,
    private readonly _resultRepository: ResultRepository,
    private readonly _linkedResultRepository: LinkedResultRepository,
    private readonly _nonPooledProjectRepository: NonPooledProjectRepository,
    private readonly _resultActorRepository: ResultActorRepository,
    private readonly _resultByInstitutionsByDeliveriesTypeRepository: ResultByInstitutionsByDeliveriesTypeRepository,
    private readonly _resultCountryRepository: ResultCountryRepository,
    private readonly _resultAnswerRepository: ResultAnswerRepository,
    private readonly _resultRegionRepository: ResultRegionRepository,
    private readonly _resultsCenterRepository: ResultsCenterRepository,
    private readonly _resultsImpactAreaIndicatorRepository: ResultsImpactAreaIndicatorRepository,
    private readonly _resultsImpactAreaTargetRepository: ResultsImpactAreaTargetRepository,
    private readonly _resultsInvestmentDiscontinuedOptionRepository: ResultsInvestmentDiscontinuedOptionRepository,
    private readonly _resultsKnowledgeProductAltmetricRepository: ResultsKnowledgeProductAltmetricRepository,
    private readonly _resultsKnowledgeProductAuthorRepository: ResultsKnowledgeProductAuthorRepository,
    private readonly _resultsKnowledgeProductKeywordRepository: ResultsKnowledgeProductKeywordRepository,
    private readonly _resultsKnowledgeProductMetadataRepository: ResultsKnowledgeProductMetadataRepository,
    private readonly _resultsKnowledgeProductsRepository: ResultsKnowledgeProductsRepository,
    private readonly _resultsActionAreaOutcomeRepository: ResultsActionAreaOutcomeRepository,
    private readonly _resultsTocImpactAreaTargetRepository: ResultsTocImpactAreaTargetRepository,
    private readonly _resultsTocTargetIndicatorRepository: ResultsTocTargetIndicatorRepository,
    private readonly _resultsTocSdgTargetRepository: ResultsTocSdgTargetRepository,
    private readonly _resultsSdgTargetRepository: ResultsSdgTargetRepository,
    private readonly _resultsTocResultIndicatorsRepository: ResultsTocResultIndicatorsRepository,
    private readonly _resultsTocResultRepository: ResultsTocResultRepository,
    private readonly _resultValidationRepository: resultValidationRepository,
    private readonly _resultByEvidencesRepository: ResultByEvidencesRepository,
    private readonly _resultByInitiativesRepository: ResultByInitiativesRepository,
    private readonly _resultByIntitutionsTypeRepository: ResultByIntitutionsTypeRepository,
    private readonly _resultByIntitutionsRepository: ResultByIntitutionsRepository,
    private readonly _resultsCapacityDevelopmentsRepository: ResultsCapacityDevelopmentsRepository,
    private readonly _resultsInnovationsDevRepository: ResultsInnovationsDevRepository,
    private readonly _resultsInnovationsUseMeasuresRepository: ResultsInnovationsUseMeasuresRepository,
    private readonly _resultsInnovationsUseRepository: ResultsInnovationsUseRepository,
    private readonly _resultsPolicyChangesRepository: ResultsPolicyChangesRepository,
    private readonly _shareResultRequestRepository: ShareResultRequestRepository,
    private readonly _evidencesRepository: EvidencesRepository,
    private readonly _resultsKnowledgeProductFairScoreRepository: ResultsKnowledgeProductFairScoreRepository,
    private readonly _resultsKnowledgeProductInstitutionRepository: ResultsKnowledgeProductInstitutionRepository,
    private readonly _elasticService: ElasticService,
    private readonly _resultsService: ResultsService,
    private readonly _logRepository: LogRepository,
  ) {}

  async deleteResult(result_id: number, user: TokenDto) {
    try {
      const resultData = await this._resultRepository.findOne({
        where: {
          id: result_id,
        },
      });
      if (!resultData) {
        throw this._returnResponse.format({
          message: 'Result not found',
          response: result_id,
          statusCode: HttpStatus.NOT_FOUND,
        });
      }

      await this._ipsrRepository.logicalDelete(resultData.id);
      await this._innovationPackagingExpertRepository.logicalDelete(
        resultData.id,
      );
      await this._resultIpExpertisesRepository.logicalDelete(resultData.id);
      await this._resultIpAAOutcomeRepository.logicalDelete(resultData.id);
      await this._resultIpEoiOutcomeRepository.logicalDelete(resultData.id);
      await this._resultIpExpertWorkshopOrganizedRepostory.logicalDelete(
        resultData.id,
      );
      await this._resultIpImpactAreaRepository.logicalDelete(resultData.id);
      await this._resultIpSdgTargetRepository.logicalDelete(resultData.id);
      await this._resultInnovationPackageRepository.logicalDelete(
        resultData.id,
      );
      await this._resultIpMeasureRepository.logicalDelete(resultData.id);
      await this._resultsByIpInnovationUseMeasureRepository.logicalDelete(
        resultData.id,
      );
      await this._resultsComplementaryInnovationRepository.logicalDelete(
        resultData.id,
      );
      await this._resultsComplementaryInnovationsFunctionRepository.logicalDelete(
        resultData.id,
      );
      await this._resultsInnovationPackagesEnablerTypeRepository.logicalDelete(
        resultData.id,
      );
      await this._resultsIpActorRepository.logicalDelete(resultData.id);
      await this._resultsIpInstitutionTypeRepository.logicalDelete(
        resultData.id,
      );
      await this._resultRepository.logicalDelete(resultData.id);
      await this._linkedResultRepository.logicalDelete(resultData.id);
      await this._nonPooledProjectRepository.logicalDelete(resultData.id);
      await this._resultActorRepository.logicalDelete(resultData.id);
      await this._resultByInstitutionsByDeliveriesTypeRepository.logicalDelete(
        resultData.id,
      );
      await this._resultCountryRepository.logicalDelete(resultData.id);
      await this._resultAnswerRepository.logicalDelete(resultData.id);
      await this._resultRegionRepository.logicalDelete(resultData.id);
      await this._resultsCenterRepository.logicalDelete(resultData.id);
      await this._resultsImpactAreaIndicatorRepository.logicalDelete(
        resultData.id,
      );
      await this._resultsImpactAreaTargetRepository.logicalDelete(
        resultData.id,
      );
      await this._resultsInvestmentDiscontinuedOptionRepository.logicalDelete(
        resultData.id,
      );
      await this._resultsKnowledgeProductAltmetricRepository.logicalDelete(
        resultData.id,
      );
      await this._resultsKnowledgeProductAuthorRepository.logicalDelete(
        resultData.id,
      );
      await this._resultsKnowledgeProductKeywordRepository.logicalDelete(
        resultData.id,
      );
      await this._resultsKnowledgeProductMetadataRepository.logicalDelete(
        resultData.id,
      );
      await this._resultsKnowledgeProductsRepository.logicalDelete(
        resultData.id,
      );
      await this._resultsActionAreaOutcomeRepository.logicalDelete(
        resultData.id,
      );
      await this._resultsTocImpactAreaTargetRepository.logicalDelete(
        resultData.id,
      );
      await this._resultsTocTargetIndicatorRepository.logicalDelete(
        resultData.id,
      );
      await this._resultsTocSdgTargetRepository.logicalDelete(resultData.id);
      await this._resultsSdgTargetRepository.logicalDelete(resultData.id);
      await this._resultsTocResultIndicatorsRepository.logicalDelete(
        resultData.id,
      );
      await this._resultsTocResultRepository.logicalDelete(resultData.id);
      await this._resultValidationRepository.logicalDelete(resultData.id);
      await this._resultByEvidencesRepository.logicalDelete(resultData.id);
      await this._resultByInitiativesRepository.logicalDelete(resultData.id);
      await this._resultByIntitutionsTypeRepository.logicalDelete(
        resultData.id,
      );
      await this._resultByIntitutionsRepository.logicalDelete(resultData.id);
      await this._resultsCapacityDevelopmentsRepository.logicalDelete(
        resultData.id,
      );
      await this._resultsInnovationsDevRepository.logicalDelete(resultData.id);
      await this._resultsInnovationsUseMeasuresRepository.logicalDelete(
        resultData.id,
      );
      await this._resultsInnovationsUseRepository.logicalDelete(resultData.id);
      await this._resultsPolicyChangesRepository.logicalDelete(resultData.id);
      await this._shareResultRequestRepository.logicalDelete(resultData.id);
      await this._evidencesRepository.logicalDelete(resultData.id);
      await this._resultsKnowledgeProductFairScoreRepository.logicalDelete(
        resultData.id,
      );
      await this._resultsKnowledgeProductInstitutionRepository.logicalDelete(
        resultData.id,
      );

      const toUpdateFromElastic = await this._resultsService.findAllSimplified(
        resultData.id.toString(),
        true,
      );
      if (toUpdateFromElastic.status !== HttpStatus.OK) {
        this._logger.warn(
          `the result #${resultData.id} could not be found to be deleted in the elastic search`,
        );
      } else {
        try {
          const elasticOperations = [
            new ElasticOperationDto('DELETE', toUpdateFromElastic.response[0]),
          ];
          const elasticJson =
            this._elasticService.getBulkElasticOperationResults(
              process.env.ELASTIC_DOCUMENT_NAME,
              elasticOperations,
            );
          const bulk = await this._elasticService.sendBulkOperationToElastic(
            elasticJson,
          );
          /*await this._logRepository.createLog(
            resultData,
            user,
            Actions.DELETE,
            { class: ResultsService.name, method: `deleteResult` },
            null,
            { is_active: true },
            { is_active: false },
          );*/
        } catch (error) {
          this._logger.warn(
            `the elastic removal failed for the result #${resultData.id}`,
          );
        }
      }
      return this._returnResponse.format({
        message: `The result with code ${resultData.result_code} has been deleted`,
        response: resultData,
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      return this._returnResponse.format(error, !env.IS_PRODUCTION);
    }
  }
}
