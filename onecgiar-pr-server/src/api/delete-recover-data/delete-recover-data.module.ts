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
import { ResultsService } from '../results/results.service';
import { ClarisaInitiativesRepository } from '../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { ResultTypesService } from '../results/result_types/result_types.service';
import { VersionsService } from '../results/versions/versions.service';
import { ResultsByInititiativesService } from '../results/results_by_inititiatives/results_by_inititiatives.service';
import { YearRepository } from '../results/years/year.repository';
import { ResultLevelRepository } from '../results/result_levels/resultLevel.repository';
import { ResultByLevelRepository } from '../results/result-by-level/result-by-level.repository';
import { ResultLegacyRepository } from '../results/legacy-result/legacy-result.repository';
import { ClarisaInstitutionsRepository } from '../../clarisa/clarisa-institutions/ClariasaInstitutions.repository';
import { ClarisaInstitutionsTypeRepository } from '../../clarisa/clarisa-institutions-type/ClariasaInstitutionsType.repository';
import { ResultRegionsService } from '../results/result-regions/result-regions.service';
import { ResultCountriesService } from '../results/result-countries/result-countries.service';
import { GenderTagRepository } from '../results/gender_tag_levels/genderTag.repository';
import { ElasticService } from '../../elastic/elastic.service';
import { LogRepository } from '../../connection/dynamodb-logs/dynamodb-logs.repository';
import { VersioningService } from '../versioning/versioning.service';
import { ResultInitiativeBudgetRepository } from '../results/result_budget/repositories/result_initiative_budget.repository';
import { ResultTypeRepository } from '../results/result_types/resultType.repository';
import { VersionRepository } from '../versioning/versioning.repository';
import { ClarisaGeographicScopeRepository } from '../../clarisa/clarisa-geographic-scopes/clarisa-geographic-scopes.repository';
import { HttpModule } from '@nestjs/axios';
import { ApplicationModulesRepository } from '../versioning/repositories/application-modules.repository';
import { PrmsTablesTypesModule } from './prms-tables-types/prms-tables-types.module';
import { EvidenceSharepointRepository } from '../results/evidences/repositories/evidence-sharepoint.repository';
import { SharePointModule } from '../../shared/services/share-point/share-point.module';
import { EvidencesService } from '../results/evidences/evidences.service';
import { ResultInstitutionsBudgetRepository } from '../results/result_budget/repositories/result_institutions_budget.repository';
import { NonPooledProjectBudgetRepository } from '../results/result_budget/repositories/non_pooled_proyect_budget.repository';
import { ResultCountriesSubNationalRepository } from '../results/result-countries-sub-national/repositories/result-countries-sub-national.repository';
import { KnowledgeProductFairBaselineRepository } from '../results/knowledge_product_fair_baseline/knowledge_product_fair_baseline.repository';
import { ResultCountrySubnationalRepository } from '../results/result-countries-sub-national/repositories/result-country-subnational.repository';
import { ResultsTocResultIndicatorsService } from '../results/results-toc-results/results-toc-result-indicators.service';

@Module({
  controllers: [DeleteRecoverDataController],
  providers: [
    EvidencesService,
    EvidenceSharepointRepository,
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
    ResultsService,
    ClarisaInitiativesRepository,
    ResultTypesService,
    VersionsService,
    ResultsByInititiativesService,
    YearRepository,
    ResultLevelRepository,
    ResultByLevelRepository,
    ResultLegacyRepository,
    ClarisaInstitutionsRepository,
    ClarisaInstitutionsTypeRepository,
    ResultRegionsService,
    ResultCountriesService,
    GenderTagRepository,
    ElasticService,
    LogRepository,
    VersioningService,
    ResultInitiativeBudgetRepository,
    ResultTypeRepository,
    VersionRepository,
    ClarisaGeographicScopeRepository,
    ApplicationModulesRepository,
    ResultInstitutionsBudgetRepository,
    NonPooledProjectBudgetRepository,
    ResultCountriesSubNationalRepository,
    KnowledgeProductFairBaselineRepository,
    ResultCountrySubnationalRepository,
    ResultsTocResultIndicatorsService,
  ],
  imports: [HttpModule, PrmsTablesTypesModule, SharePointModule],
  exports: [
    EvidencesService,
    ResultInstitutionsBudgetRepository,
    NonPooledProjectBudgetRepository,
    ResultInitiativeBudgetRepository,
    ResultCountriesSubNationalRepository,
    KnowledgeProductFairBaselineRepository,
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
    ResultsService,
    ClarisaInitiativesRepository,
    ResultTypesService,
    VersionsService,
    ResultsByInititiativesService,
    YearRepository,
    ResultLevelRepository,
    ResultByLevelRepository,
    ResultLegacyRepository,
    ClarisaInstitutionsRepository,
    ClarisaInstitutionsTypeRepository,
    ResultRegionsService,
    ResultCountriesService,
    GenderTagRepository,
    ElasticService,
    LogRepository,
    VersioningService,
    ResultTypeRepository,
    VersionRepository,
    ClarisaGeographicScopeRepository,
    ApplicationModulesRepository,
    DeleteRecoverDataService,
    EvidenceSharepointRepository,
    EvidencesService,
  ],
})
export class DeleteRecoverDataModule {}
