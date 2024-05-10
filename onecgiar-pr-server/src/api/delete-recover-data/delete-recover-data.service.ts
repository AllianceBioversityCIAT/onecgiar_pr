import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  ReturnResponse,
  ReturnResponseDto,
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
import { ResultInstitutionsBudgetRepository } from '../results/result_budget/repositories/result_institutions_budget.repository';
import { NonPooledProjectBudgetRepository } from '../results/result_budget/repositories/non_pooled_proyect_budget.repository';
import { ResultInitiativeBudgetRepository } from '../results/result_budget/repositories/result_initiative_budget.repository';
import { Result } from '../results/entities/result.entity';
import { ResultLevelEnum } from '../../shared/constants/result-level.enum';
import { ResultTypeEnum } from '../../shared/constants/result-type.enum';
import { EvidenceSharepointRepository } from '../results/evidences/repositories/evidence-sharepoint.repository';
import { InstitutionRoleEnum } from '../results/results_by_institutions/entities/institution_role.enum';
import { ResultCountriesSubNationalRepository } from '../results/result-countries-sub-national/repositories/result-countries-sub-national.repository';
import { KnowledgeProductFairBaselineRepository } from '../results/knowledge_product_fair_baseline/knowledge_product_fair_baseline.repository';
import { EvidenceTypeEnum } from '../../shared/constants/evidence-type.enum';
import { isProduction } from '../../shared/utils/validation.utils';

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
    private readonly _evidenceSharepointRepository: EvidenceSharepointRepository,
    private readonly _resultInstitutionsBudgetRepository: ResultInstitutionsBudgetRepository,
    private readonly _nonPooledProjectBudgetRepository: NonPooledProjectBudgetRepository,
    private readonly _resultInitiativeBudgetRepository: ResultInitiativeBudgetRepository,
    private readonly _resultCountriesSubNationalRepository: ResultCountriesSubNationalRepository,
    private readonly _knowledgeProductFairBaselineRepository: KnowledgeProductFairBaselineRepository,
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

      if (resultData.status_id == 2)
        throw this._returnResponse.format({
          message: 'Is already Quality Assessed',
          statusCode: HttpStatus.BAD_REQUEST,
          response: resultData,
        });

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
      await this._evidenceSharepointRepository.logicalDelete(resultData.id);
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
      await this._resultInstitutionsBudgetRepository.logicalDelete(
        resultData.id,
      );
      await this._nonPooledProjectBudgetRepository.logicalDelete(resultData.id);
      await this._resultInitiativeBudgetRepository.logicalDelete(resultData.id);
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

          await this._elasticService.sendBulkOperationToElastic(elasticJson);

          await this._logRepository.createLog(
            resultData,
            user,
            Actions.DELETE,
            { class: ResultsService.name, method: `deleteResult` },
            null,
            { is_active: true },
            { is_active: false },
          );
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
      return this._returnResponse.format(error, !isProduction());
    }
  }

  /**
   *
   * @param result_id
   * @param result_level_id
   * @param result_type_id
   * @param justification
   * @param user
   * @param from_endpoint
   * @param new_name
   */
  async changeResultType(
    result_id: number,
    new_result_level_id: number,
    new_result_type_id: number,
    justification: string,
    user: TokenDto,
    from_endpoint = true,
    new_name?: string,
  ) {
    try {
      if (
        !result_id ||
        result_id < 1 ||
        !new_result_level_id ||
        new_result_level_id < 1 ||
        !new_result_type_id ||
        new_result_type_id < 1 ||
        !justification ||
        justification.length < 1
      ) {
        throw this._returnResponse.format({
          message: `The result id, result level id, result type id and justification are required`,
          response: null,
          statusCode: HttpStatus.BAD_REQUEST,
        });
      }

      const resultToUpdate = await this._resultRepository.findOne({
        where: {
          id: result_id,
          is_active: true,
        },
      });

      const resultAfterbefore = { ...resultToUpdate };

      if (!resultToUpdate) {
        throw this._returnResponse.format({
          message: `The result with id ${result_id} was not found`,
          response: null,
          statusCode: HttpStatus.NOT_FOUND,
        });
      }

      if (
        new_result_type_id == ResultTypeEnum.KNOWLEDGE_PRODUCT &&
        from_endpoint
      ) {
        throw this._returnResponse.format({
          message: `The result with id ${result_id} is a knowledge product and can not be changed from the endpoint`,
          response: null,
          statusCode: HttpStatus.BAD_REQUEST,
        });
      }

      resultToUpdate.result_type_id = new_result_type_id;
      resultToUpdate.result_level_id = new_result_level_id;
      resultToUpdate.last_action_type = Actions.CHANGE_RESULT_TYPE;
      resultToUpdate.justification_action_type = justification;
      resultToUpdate.title = new_name || resultToUpdate.title;

      await this._resultRepository.update(
        { id: resultToUpdate.id },
        {
          result_type_id: resultToUpdate.result_type_id,
          result_level_id: resultToUpdate.result_level_id,
          last_action_type: resultToUpdate.last_action_type,
          justification_action_type: resultToUpdate.justification_action_type,
          title: resultToUpdate.title,
        },
      );

      await this.manageChangedResultTypeData(
        resultAfterbefore,
        new_result_level_id,
        new_result_type_id,
      );

      //updating elastic search
      if (new_name) {
        const toUpdateFromElastic =
          await this._resultsService.findAllSimplified(
            resultToUpdate.id.toString(),
          );
        if (toUpdateFromElastic.status !== HttpStatus.OK) {
          this._logger.warn(
            `the result #${resultToUpdate.id} could not be found to be updated in the elastic search`,
          );
        } else {
          try {
            const elasticOperations = [
              new ElasticOperationDto('PATCH', toUpdateFromElastic.response[0]),
            ];

            const elasticJson =
              this._elasticService.getBulkElasticOperationResults(
                process.env.ELASTIC_DOCUMENT_NAME,
                elasticOperations,
              );

            await this._elasticService.sendBulkOperationToElastic(elasticJson);
          } catch (error) {
            this._logger.warn(
              `the elastic removal failed for the result #${resultToUpdate.id}`,
            );
          }
        }
      }

      // updating dynamodb logs
      await this._logRepository.createLog(
        resultToUpdate,
        user,
        Actions.CHANGE_RESULT_TYPE,
        {
          class: DeleteRecoverDataService.name,
          method: `changeResultType`,
        },
      );

      return this._returnResponse.format({
        message: `The result with code ${resultToUpdate.result_code} and phase ${resultToUpdate.version_id} has its type updated successfully`,
        response: resultToUpdate,
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      return this._returnResponse.format(error, !isProduction());
    }
  }

  async manageChangedResultTypeData(
    result: Result,
    new_result_level: ResultLevelEnum,
    new_result_type: ResultTypeEnum,
  ): Promise<ReturnResponseDto<any>> {
    try {
      const returnDelete = await this.deleteDataByNewResultType(
        result.id,
        new_result_type,
        new_result_level,
        result.result_type_id,
        result.result_level_id,
      );

      if (returnDelete.statusCode >= 300) {
        throw this._returnResponse.format({
          message: `The data at the time of deleting had an error`,
          response: result.result_code,
          statusCode: HttpStatus.OK,
        });
      }

      const returnMigration = await this.migrateDataByNewResultType(
        result.id,
        new_result_type,
        new_result_level,
        result.result_type_id,
        result.result_level_id,
      );

      if (returnMigration.statusCode >= 300) {
        throw this._returnResponse.format({
          message: `The data at the time of migrating had an error`,
          response: result.result_code,
          statusCode: HttpStatus.OK,
        });
      }

      return this._returnResponse.format({
        message: `The data of the result with code ${result.id} has been changed`,
        response: result.result_code,
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      return this._returnResponse.format(error, !isProduction());
    }
  }

  /**
   *
   * @param result_id
   * @param _new_result_type
   * @param _new_result_level
   * @param _old_result_type
   * @param _old_result_level
   * @returns
   * @description This method is used to migrate the data of a result that has changed its type
   *
   */
  async migrateDataByNewResultType(
    result_id: number,
    new_result_type: ResultTypeEnum,
    _new_result_level: ResultLevelEnum,
    old_result_type: ResultTypeEnum,
    _old_result_level: ResultLevelEnum,
  ) {
    try {
      if (ResultTypeEnum.KNOWLEDGE_PRODUCT == old_result_type) {
        await this._resultByIntitutionsRepository.changePartnersType(
          result_id,
          [InstitutionRoleEnum.KNOWLEDGE_PRODUCT_ADDITIONAL_CONTRIBUTORS],
          InstitutionRoleEnum.PARTNER,
        );
      }

      if (new_result_type == ResultTypeEnum.KNOWLEDGE_PRODUCT) {
        await this._resultByIntitutionsRepository.changePartnersType(
          result_id,
          [InstitutionRoleEnum.PARTNER],
          InstitutionRoleEnum.KNOWLEDGE_PRODUCT_ADDITIONAL_CONTRIBUTORS,
        );
        await this._resultRepository.update(result_id, {
          geographic_scope_id: null,
        });
      }

      return this._returnResponse.format({
        message: `The result with code ${result_id} has been migrated`,
        response: result_id,
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      return this._returnResponse.format(error, !isProduction());
    }
  }

  /**
   *
   * @param result_id
   * @param _new_result_type
   * @param _new_result_level
   * @param _old_result_type
   * @param _old_result_level
   * @returns
   * @description This method is used to delete the data of a result that has changed its type
   */
  async deleteDataByNewResultType(
    result_id: number,
    new_result_type: ResultTypeEnum,
    new_result_level: ResultLevelEnum,
    old_result_type: ResultTypeEnum,
    old_result_level: ResultLevelEnum,
  ) {
    try {
      await this._resultsImpactAreaIndicatorRepository.fisicalDelete(result_id);
      await this._resultCountriesSubNationalRepository.fisicalDelete(result_id);
      await this._resultsTocSdgTargetRepository.fisicalDelete(result_id);
      await this._resultsTocImpactAreaTargetRepository.fisicalDelete(result_id);
      await this._resultsTocTargetIndicatorRepository.fisicalDelete(result_id);
      await this._resultsTocResultIndicatorsRepository.fisicalDelete(result_id);

      if (old_result_type == ResultTypeEnum.KNOWLEDGE_PRODUCT) {
        await this._resultByIntitutionsRepository.fisicalDeleteByTypeAndResultId(
          result_id,
          [InstitutionRoleEnum.PARTNER],
        );
        await this._evidencesRepository.fisicalDeleteByEvidenceIdAndResultId(
          result_id,
          [EvidenceTypeEnum.MAIN],
        );
      }

      if (new_result_level != old_result_level) {
        await this._resultInitiativeBudgetRepository.fisicalDelete(result_id);
        await this._resultByInitiativesRepository.fisicalContributorsDelete(
          result_id,
        );
        await this._resultsSdgTargetRepository.fisicalDelete(result_id);
        await this._resultsActionAreaOutcomeRepository.fisicalDelete(result_id);
        await this._resultsImpactAreaTargetRepository.fisicalDelete(result_id);
        await this._resultsTocResultRepository.fisicalDelete(result_id);
      }

      // delete every data not related to the new result type
      switch (new_result_type) {
        case ResultTypeEnum.IMPACT_CONTRIBUTION:
          this.DELETE_impact_contribution(result_id);
          break;

        case ResultTypeEnum.POLICY_CHANGE:
          this.DELETE_action_area_outcome(result_id, new_result_level);
          break;

        case ResultTypeEnum.INNOVATION_USE:
          this.DELETE_innovation_use(result_id, new_result_level);
          break;

        case ResultTypeEnum.OTHER_OUTCOME:
          this.DELETE_other_outcome(result_id, new_result_level);
          break;

        case ResultTypeEnum.KNOWLEDGE_PRODUCT:
          this.DELETE_knowledge_product(result_id);
          break;

        case ResultTypeEnum.INNOVATION_DEVELOPMENT:
          this.DELETE_innovation_dev(result_id);
          break;

        case ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT:
          this.DELETE_capacity_sharing_for_development(result_id);
          break;

        case ResultTypeEnum.OTHER_OUTPUT:
          this.DELETE_other_output(result_id);
          break;
      }

      return this._returnResponse.format({
        message: `The data of the result with code ${result_id} has been deleted`,
        response: result_id,
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      return this._returnResponse.format(error, !isProduction());
    }
  }

  private async DELETE_knowledge_product(result_id: number) {
    await this._nonPooledProjectBudgetRepository.fisicalDelete(result_id);
    await this._resultActorRepository.fisicalDelete(result_id);
    await this._resultAnswerRepository.fisicalDelete(result_id);
    await this._resultInitiativeBudgetRepository.fisicalDelete(result_id);
    await this._resultInstitutionsBudgetRepository.fisicalDelete(result_id);
    await this._resultsSdgTargetRepository.fisicalDelete(result_id);
    await this._resultsActionAreaOutcomeRepository.fisicalDelete(result_id);
    await this._resultByIntitutionsTypeRepository.fisicalDelete(result_id);
    await this._resultsCapacityDevelopmentsRepository.fisicalDelete(result_id);
    await this._resultsImpactAreaTargetRepository.fisicalDelete(result_id);
    await this._resultsInnovationsDevRepository.fisicalDelete(result_id);
    await this._resultsInnovationsUseMeasuresRepository.fisicalDelete(
      result_id,
    );
    await this._resultsInnovationsUseRepository.fisicalDelete(result_id);
    await this._resultsPolicyChangesRepository.fisicalDelete(result_id);
    await this._evidencesRepository.fisicalDelete(result_id);
    await this._resultCountryRepository.fisicalDelete(result_id);
    await this._resultRegionRepository.fisicalDelete(result_id);
    await this._resultsCenterRepository.fisicalDelete(result_id);
    await this._resultByIntitutionsRepository.fisicalDeleteByTypeAndResultId(
      result_id,
      [
        InstitutionRoleEnum.CAPDEV_TRAINEES_ON_BEHALF,
        InstitutionRoleEnum.POLICY_OWNER,
      ],
    );
  }

  private async DELETE_impact_contribution(result_id: number) {
    await this._nonPooledProjectBudgetRepository.fisicalDelete(result_id);
    await this._resultActorRepository.fisicalDelete(result_id);
    await this._resultAnswerRepository.fisicalDelete(result_id);
    await this._resultInstitutionsBudgetRepository.fisicalDelete(result_id);
    await this._resultsActionAreaOutcomeRepository.fisicalDelete(result_id);
    await this._resultByIntitutionsTypeRepository.fisicalDelete(result_id);
    await this._resultsCapacityDevelopmentsRepository.fisicalDelete(result_id);
    await this._resultsInnovationsDevRepository.fisicalDelete(result_id);
    await this._resultsInnovationsUseMeasuresRepository.fisicalDelete(
      result_id,
    );
    await this._resultsInnovationsUseRepository.fisicalDelete(result_id);
    await this.DELETE_common_kp_data(result_id);
    await this._resultsPolicyChangesRepository.fisicalDelete(result_id);
    await this._evidencesRepository.fisicalDeleteByEvidenceIdAndResultId(
      result_id,
      [EvidenceTypeEnum.PICTURES, EvidenceTypeEnum.MATERIALS],
    );
    await this._resultByIntitutionsRepository.fisicalDeleteByTypeAndResultId(
      result_id,
      [
        InstitutionRoleEnum.KNOWLEDGE_PRODUCT_ADDITIONAL_CONTRIBUTORS,
        InstitutionRoleEnum.CAPDEV_TRAINEES_ON_BEHALF,
        InstitutionRoleEnum.POLICY_OWNER,
      ],
    );
  }

  private async CoomonDelete(result_id: number) {
    await this._nonPooledProjectBudgetRepository.fisicalDelete(result_id);
    await this._resultActorRepository.fisicalDelete(result_id);
    await this._resultAnswerRepository.fisicalDelete(result_id);
    await this._resultInitiativeBudgetRepository.fisicalDelete(result_id);
    await this._resultInstitutionsBudgetRepository.fisicalDelete(result_id);
    await this._resultByIntitutionsTypeRepository.fisicalDelete(result_id);
    await this._resultsCapacityDevelopmentsRepository.fisicalDelete(result_id);
    await this._resultsInnovationsDevRepository.fisicalDelete(result_id);
    await this._resultsInnovationsUseMeasuresRepository.fisicalDelete(
      result_id,
    );
    await this._resultsInnovationsUseRepository.fisicalDelete(result_id);
  }

  private async DELETE_action_area_outcome(
    result_id: number,
    _result_level: ResultLevelEnum,
  ) {
    await this.CoomonDelete(result_id);
    await this.DELETE_common_kp_data(result_id);
    await this._evidencesRepository.fisicalDeleteByEvidenceIdAndResultId(
      result_id,
      [EvidenceTypeEnum.PICTURES, EvidenceTypeEnum.MATERIALS],
    );
    await this._resultByIntitutionsRepository.fisicalDeleteByTypeAndResultId(
      result_id,
      [
        InstitutionRoleEnum.CAPDEV_TRAINEES_ON_BEHALF,
        InstitutionRoleEnum.KNOWLEDGE_PRODUCT_ADDITIONAL_CONTRIBUTORS,
      ],
    );
  }

  private async DELETE_common_kp_data(result_id: number) {
    await this._resultsKnowledgeProductAltmetricRepository.fisicalDelete(
      result_id,
    );
    await this._resultsKnowledgeProductAuthorRepository.fisicalDelete(
      result_id,
    );
    await this._knowledgeProductFairBaselineRepository.fisicalDelete(result_id);
    await this._knowledgeProductFairBaselineRepository.fisicalDeleteLegacy(
      result_id,
    );
    await this._resultsKnowledgeProductKeywordRepository.fisicalDelete(
      result_id,
    );
    await this._resultsKnowledgeProductMetadataRepository.fisicalDelete(
      result_id,
    );
    await this._resultsKnowledgeProductInstitutionRepository.fisicalDelete(
      result_id,
    );
    await this._resultsKnowledgeProductFairScoreRepository.fisicalDelete(
      result_id,
    );
    await this._resultsKnowledgeProductsRepository.fisicalDelete(result_id);
  }

  private async DELETE_other_outcome(
    result_id: number,
    _result_level: ResultLevelEnum,
  ) {
    await this.CoomonDelete(result_id);
    await this._resultsPolicyChangesRepository.fisicalDelete(result_id);
    this.DELETE_common_kp_data(result_id);
    await this._evidencesRepository.fisicalDeleteByEvidenceIdAndResultId(
      result_id,
      [EvidenceTypeEnum.PICTURES, EvidenceTypeEnum.MATERIALS],
    );
    await this._resultByIntitutionsRepository.fisicalDeleteByTypeAndResultId(
      result_id,
      [
        InstitutionRoleEnum.CAPDEV_TRAINEES_ON_BEHALF,
        InstitutionRoleEnum.POLICY_OWNER,
        InstitutionRoleEnum.KNOWLEDGE_PRODUCT_ADDITIONAL_CONTRIBUTORS,
      ],
    );
  }

  private async DELETE_innovation_dev(result_id: number) {
    await this.DELETE_common_kp_data(result_id);
    await this._resultActorRepository.fisicalDelete(result_id);
    await this._resultsSdgTargetRepository.fisicalDelete(result_id);
    await this._resultsActionAreaOutcomeRepository.fisicalDelete(result_id);
    await this._resultByIntitutionsTypeRepository.fisicalDelete(result_id);
    await this._resultsCapacityDevelopmentsRepository.fisicalDelete(result_id);
    await this._resultsImpactAreaTargetRepository.fisicalDelete(result_id);
    await this._resultsInnovationsUseMeasuresRepository.fisicalDelete(
      result_id,
    );
    await this._resultsInnovationsUseRepository.fisicalDelete(result_id);
    await this._resultsPolicyChangesRepository.fisicalDelete(result_id);
    await this._resultByIntitutionsRepository.fisicalDeleteByTypeAndResultId(
      result_id,
      [
        InstitutionRoleEnum.CAPDEV_TRAINEES_ON_BEHALF,
        InstitutionRoleEnum.POLICY_OWNER,
        InstitutionRoleEnum.KNOWLEDGE_PRODUCT_ADDITIONAL_CONTRIBUTORS,
      ],
    );
  }

  private async DELETE_capacity_sharing_for_development(result_id: number) {
    await this.DELETE_common_kp_data(result_id);
    await this._nonPooledProjectBudgetRepository.fisicalDelete(result_id);
    await this._resultActorRepository.fisicalDelete(result_id);
    await this._resultAnswerRepository.fisicalDelete(result_id);
    await this._resultInstitutionsBudgetRepository.fisicalDelete(result_id);
    await this._resultInitiativeBudgetRepository.fisicalDelete(result_id);
    await this._resultsSdgTargetRepository.fisicalDelete(result_id);
    await this._resultsActionAreaOutcomeRepository.fisicalDelete(result_id);
    await this._resultByIntitutionsTypeRepository.fisicalDelete(result_id);
    await this._resultsImpactAreaTargetRepository.fisicalDelete(result_id);
    await this._resultsInnovationsDevRepository.fisicalDelete(result_id);
    await this._resultsInnovationsUseMeasuresRepository.fisicalDelete(
      result_id,
    );
    await this._resultsInnovationsUseRepository.fisicalDelete(result_id);
    await this._resultsPolicyChangesRepository.fisicalDelete(result_id);
    await this._evidencesRepository.fisicalDeleteByEvidenceIdAndResultId(
      result_id,
      [EvidenceTypeEnum.PICTURES, EvidenceTypeEnum.MATERIALS],
    );
    await this._resultByIntitutionsRepository.fisicalDeleteByTypeAndResultId(
      result_id,
      [
        InstitutionRoleEnum.POLICY_OWNER,
        InstitutionRoleEnum.KNOWLEDGE_PRODUCT_ADDITIONAL_CONTRIBUTORS,
      ],
    );
  }

  private async DELETE_other_output(result_id: number) {
    await this.DELETE_common_kp_data(result_id);
    await this._nonPooledProjectBudgetRepository.fisicalDelete(result_id);
    await this._resultActorRepository.fisicalDelete(result_id);
    await this._resultAnswerRepository.fisicalDelete(result_id);
    await this._resultInstitutionsBudgetRepository.fisicalDelete(result_id);
    await this._resultInitiativeBudgetRepository.fisicalDelete(result_id);
    await this._resultsSdgTargetRepository.fisicalDelete(result_id);
    await this._resultsActionAreaOutcomeRepository.fisicalDelete(result_id);
    await this._resultByIntitutionsTypeRepository.fisicalDelete(result_id);
    await this._resultsCapacityDevelopmentsRepository.fisicalDelete(result_id);
    await this._resultsImpactAreaTargetRepository.fisicalDelete(result_id);
    await this._resultsInnovationsDevRepository.fisicalDelete(result_id);
    await this._resultsInnovationsUseMeasuresRepository.fisicalDelete(
      result_id,
    );
    await this._resultsInnovationsUseRepository.fisicalDelete(result_id);
    await this._resultsPolicyChangesRepository.fisicalDelete(result_id);
    await this._resultByIntitutionsRepository.fisicalDeleteByTypeAndResultId(
      result_id,
      [
        InstitutionRoleEnum.CAPDEV_TRAINEES_ON_BEHALF,
        InstitutionRoleEnum.POLICY_OWNER,
        InstitutionRoleEnum.KNOWLEDGE_PRODUCT_ADDITIONAL_CONTRIBUTORS,
      ],
    );
    await this._evidencesRepository.fisicalDeleteByEvidenceIdAndResultId(
      result_id,
      [EvidenceTypeEnum.PICTURES, EvidenceTypeEnum.MATERIALS],
    );
  }

  private async DELETE_innovation_use(
    result_id: number,
    _result_level: ResultLevelEnum,
  ) {
    await this._nonPooledProjectBudgetRepository.fisicalDelete(result_id);
    await this._resultAnswerRepository.fisicalDelete(result_id);
    await this._resultInitiativeBudgetRepository.fisicalDelete(result_id);
    await this._resultInstitutionsBudgetRepository.fisicalDelete(result_id);
    await this._resultsCapacityDevelopmentsRepository.fisicalDelete(result_id);
    await this._resultsInnovationsDevRepository.fisicalDelete(result_id);
    await this._resultsPolicyChangesRepository.fisicalDelete(result_id);
    await this.DELETE_common_kp_data(result_id);
    await this._evidencesRepository.fisicalDeleteByEvidenceIdAndResultId(
      result_id,
      [EvidenceTypeEnum.PICTURES, EvidenceTypeEnum.MATERIALS],
    );
    await this._resultByIntitutionsRepository.fisicalDeleteByTypeAndResultId(
      result_id,
      [
        InstitutionRoleEnum.CAPDEV_TRAINEES_ON_BEHALF,
        InstitutionRoleEnum.POLICY_OWNER,
      ],
    );
  }
}
