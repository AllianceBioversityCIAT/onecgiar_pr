import { Module } from '@nestjs/common';
import { DeleteRecoverDataService } from './delete-recover-data.service';
import { DeleteRecoverDataController } from './delete-recover-data.controller';
import {
  HandlersError,
  ReturnResponse,
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
import { ShareResultRequestRepository } from '../results/share-result-request/share-result-request.repository';
import { EvidencesRepository } from '../results/evidences/evidences.repository';
import { ResultsKnowledgeProductFairScoreRepository } from '../results/results-knowledge-products/repositories/results-knowledge-product-fair-scores.repository';
import { ResultsKnowledgeProductInstitutionRepository } from '../results/results-knowledge-products/repositories/results-knowledge-product-institution.repository';

@Module({
  controllers: [DeleteRecoverDataController],
  providers: [
    DeleteRecoverDataService,
    HandlersError,
    ReturnResponse,
    IpsrRepository,
    InnovationPackagingExpertRepository,
    ResultIpExpertisesRepository,
    ResultIpAAOutcomeRepository,
    ResultIpEoiOutcomeRepository,
    ResultIpExpertWorkshopOrganizedRepostory,
    ResultIpImpactAreaRepository,
    ResultIpSdgTargetRepository,
    ResultInnovationPackageRepository,
    ResultIpMeasureRepository,
    ResultsByIpInnovationUseMeasureRepository,
    ResultsComplementaryInnovationRepository,
    ResultsComplementaryInnovationsFunctionRepository,
    ResultsInnovationPackagesEnablerTypeRepository,
    ResultsIpActorRepository,
    ResultsIpInstitutionTypeRepository,
    ResultRepository,
    LinkedResultRepository,
    NonPooledProjectRepository,
    ResultActorRepository,
    ResultByInstitutionsByDeliveriesTypeRepository,
    ResultCountryRepository,
    ResultAnswerRepository,
    ResultRegionRepository,
    ResultsCenterRepository,
    ResultsImpactAreaIndicatorRepository,
    ResultsImpactAreaTargetRepository,
    ResultsInvestmentDiscontinuedOptionRepository,
    ResultsKnowledgeProductAltmetricRepository,
    ResultsKnowledgeProductAuthorRepository,
    ResultsKnowledgeProductKeywordRepository,
    ResultsKnowledgeProductMetadataRepository,
    ResultsKnowledgeProductsRepository,
    ResultsActionAreaOutcomeRepository,
    ResultsTocImpactAreaTargetRepository,
    ResultsTocTargetIndicatorRepository,
    ResultsTocSdgTargetRepository,
    ResultsSdgTargetRepository,
    ResultsTocResultIndicatorsRepository,
    ResultsTocResultRepository,
    resultValidationRepository,
    ResultByEvidencesRepository,
    ResultByInitiativesRepository,
    ResultByIntitutionsTypeRepository,
    ResultByIntitutionsRepository,
    ResultsCapacityDevelopmentsRepository,
    ResultsInnovationsDevRepository,
    ResultsInnovationsUseMeasuresRepository,
    ResultsInnovationsUseRepository,
    ResultsPolicyChangesRepository,
    ShareResultRequestRepository,
    EvidencesRepository,
    ResultsKnowledgeProductFairScoreRepository,
    ResultsKnowledgeProductInstitutionRepository,
  ],
})
export class DeleteRecoverDataModule {}
