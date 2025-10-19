import { Module } from '@nestjs/common';
import { ResultsKnowledgeProductsService } from './results-knowledge-products.service';
import { ResultsKnowledgeProductsController } from './results-knowledge-products.controller';
import { ResultsKnowledgeProductsRepository } from './repositories/results-knowledge-products.repository';
import { ResultRepository } from '../result.repository';
import { MQAPService } from '../../m-qap/m-qap.service';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';
import { HttpModule } from '@nestjs/axios';
import { ResultsKnowledgeProductMapper } from './results-knowledge-products.mapper';
import { ResultsKnowledgeProductAltmetricRepository } from './repositories/results-knowledge-product-altmetrics.repository';
import { ResultsKnowledgeProductAuthorRepository } from './repositories/results-knowledge-product-authors.repository';
import { ResultsKnowledgeProductInstitutionRepository } from './repositories/results-knowledge-product-institution.repository';
import { ResultsKnowledgeProductKeywordRepository } from './repositories/results-knowledge-product-keywords.repository';
import { ResultsKnowledgeProductMetadataRepository } from './repositories/results-knowledge-product-metadata.repository';
import { ResultByInitiativesRepository } from '../results_by_inititiatives/resultByInitiatives.repository';
import { YearRepository } from '../years/year.repository';
import { VersionsService } from '../versions/versions.service';
import { ResultLevelRepository } from '../result_levels/resultLevel.repository';
import { ResultByLevelRepository } from '../result-by-level/result-by-level.repository';
import { ClarisaInitiativesRepository } from '../../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { ResultTypeRepository } from '../result_types/resultType.repository';
import { EvidencesRepository } from '../evidences/evidences.repository';
import { KnowledgeProductFairBaselineRepository } from '../knowledge_product_fair_baseline/knowledge_product_fair_baseline.repository';
import { RoleByUserRepository } from '../../../auth/modules/role-by-user/RoleByUser.repository';
import { ResultRegionRepository } from '../result-regions/result-regions.repository';
import { ClarisaRegionsRepository } from '../../../clarisa/clarisa-regions/ClariasaRegions.repository';
import { CGSpaceCountryMappingsRepository } from './repositories/cgspace-country-mappings.repository';
import { ResultCountryRepository } from '../result-countries/result-countries.repository';
import { VersioningModule } from '../../versioning/versioning.module';
import { ClarisaCountriesRepository } from '../../../clarisa/clarisa-countries/ClarisaCountries.repository';
import { ResultsKnowledgeProductFairScoreRepository } from './repositories/results-knowledge-product-fair-scores.repository';
import { FairFieldRepository } from './repositories/fair-fields.repository';
import { ResultsCenterRepository } from '../results-centers/results-centers.repository';
import { ClarisaInstitutionsRepository } from '../../../clarisa/clarisa-institutions/ClariasaInstitutions.repository';
import { ResultsService } from '../results.service';
import { ResultTypesModule } from '../result_types/result_types.module';
import { ResultsByInititiativesModule } from '../results_by_inititiatives/results_by_inititiatives.module';
import { ResultsByEvidencesModule } from '../results_by_evidences/results_by_evidences.module';
import { LegacyResultModule } from '../legacy-result/legacy-result.module';
import { ClarisaInstitutionsTypeModule } from '../../../clarisa/clarisa-institutions-type/clarisa-institutions-type.module';
import { ResultRegionsModule } from '../result-regions/result-regions.module';
import { ResultCountriesModule } from '../result-countries/result-countries.module';
import { GenderTagLevelsModule } from '../gender_tag_levels/gender_tag_levels.module';
import { ResultsValidationModuleModule } from '../results-validation-module/results-validation-module.module';
import { ElasticModule } from '../../../elastic/elastic.module';
import { DynamodbLogsModule } from '../../../connection/dynamodb-logs/dynamodb-logs.module';
import { ResultsInvestmentDiscontinuedOptionsModule } from '../results-investment-discontinued-options/results-investment-discontinued-options.module';
import { DeleteRecoverDataModule } from '../../delete-recover-data/delete-recover-data.module';
import { DeleteRecoverDataService } from '../../delete-recover-data/delete-recover-data.service';
import { GlobalParameterRepository } from '../../global-parameter/repositories/global-parameter.repository';
import { InitiativeEntityMapRepository } from '../../initiative_entity_map/initiative_entity_map.repository';
import { ImpactAreasScoresComponentsModule } from '../impact_areas_scores_components/impact_areas_scores_components.module';
import { NotificationModule } from '../../notification/notification.module';

@Module({
  imports: [
    HttpModule,
    VersioningModule,
    DeleteRecoverDataModule,
    //resultsservice imports :(
    ResultTypesModule,
    ResultsByInititiativesModule,
    ResultsByEvidencesModule,
    LegacyResultModule,
    ClarisaInstitutionsTypeModule,
    ResultRegionsModule,
    ResultCountriesModule,
    GenderTagLevelsModule,
    ElasticModule,
    ResultsValidationModuleModule,
    DynamodbLogsModule,
    ResultsInvestmentDiscontinuedOptionsModule,
    ImpactAreasScoresComponentsModule,
    NotificationModule,
  ],
  controllers: [ResultsKnowledgeProductsController],
  providers: [
    ReturnResponse,
    ResultsKnowledgeProductsService,
    HandlersError,
    ResultsKnowledgeProductsRepository,
    ResultRepository,
    ResultsService,
    MQAPService,
    VersionsService,
    ResultsKnowledgeProductMapper,
    ResultsKnowledgeProductAltmetricRepository,
    ResultsKnowledgeProductAuthorRepository,
    ResultsKnowledgeProductInstitutionRepository,
    ResultsKnowledgeProductKeywordRepository,
    ResultsKnowledgeProductMetadataRepository,
    ClarisaInitiativesRepository,
    ResultByLevelRepository,
    ResultLevelRepository,
    ResultTypeRepository,
    YearRepository,
    ResultByInitiativesRepository,
    EvidencesRepository,
    KnowledgeProductFairBaselineRepository,
    RoleByUserRepository,
    ResultRegionRepository,
    ClarisaRegionsRepository,
    CGSpaceCountryMappingsRepository,
    ResultCountryRepository,
    ClarisaCountriesRepository,
    ResultsKnowledgeProductFairScoreRepository,
    FairFieldRepository,
    ReturnResponse,
    ResultsCenterRepository,
    ClarisaInstitutionsRepository,
    DeleteRecoverDataService,
    GlobalParameterRepository,
    InitiativeEntityMapRepository,
  ],
  exports: [
    ResultsKnowledgeProductsService,
    ResultsKnowledgeProductsRepository,
    ResultRepository,
    ResultsService,
    MQAPService,
    VersionsService,
    ResultsKnowledgeProductMapper,
    ResultsKnowledgeProductAltmetricRepository,
    ResultsKnowledgeProductAuthorRepository,
    ResultsKnowledgeProductInstitutionRepository,
    ResultsKnowledgeProductKeywordRepository,
    ResultsKnowledgeProductMetadataRepository,
    ClarisaInitiativesRepository,
    ResultByLevelRepository,
    ResultLevelRepository,
    ResultTypeRepository,
    YearRepository,
    ResultByInitiativesRepository,
    EvidencesRepository,
    KnowledgeProductFairBaselineRepository,
    RoleByUserRepository,
    ResultRegionRepository,
    ClarisaRegionsRepository,
    CGSpaceCountryMappingsRepository,
    ResultCountryRepository,
    ClarisaCountriesRepository,
    ResultsKnowledgeProductFairScoreRepository,
    FairFieldRepository,
    ResultsCenterRepository,
    ClarisaInstitutionsRepository,
    DeleteRecoverDataService,
    GlobalParameterRepository,
    ResultsKnowledgeProductsService,
  ],
})
export class ResultsKnowledgeProductsModule {}
