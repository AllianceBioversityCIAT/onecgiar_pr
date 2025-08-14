import {
  forwardRef,
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ResultsService } from './results.service';
import { ResultsController } from './results.controller';
import { RouterModule } from '@nestjs/core';
import { ResultsRoutes } from './results.routes';
import { ResultLevelsModule } from './result_levels/result_levels.module';
import { ResultTypesModule } from './result_types/result_types.module';
import { GenderTagLevelsModule } from './gender_tag_levels/gender_tag_levels.module';
import { VersionsModule } from './versions/versions.module';
import { InstitutionRolesModule } from './institution_roles/institution_roles.module';
import { ResultsByInititiativesModule } from './results_by_inititiatives/results_by_inititiatives.module';
import { ResultsByInstitutionsModule } from './results_by_institutions/results_by_institutions.module';
import { ResultsByInstitutionTypesModule } from './results_by_institution_types/results_by_institution_types.module';
import { EvidencesModule } from './evidences/evidences.module';
import { ResultsByEvidencesModule } from './results_by_evidences/results_by_evidences.module';
import { EvidenceTypesModule } from './evidence_types/evidence_types.module';
import { InitiativeRolesModule } from './initiative_roles/initiative_roles.module';
import { AuthModule } from '../../auth/auth.module';
import { JwtMiddleware } from 'src/auth/Middlewares/jwt.middleware';
import {
  HandlersError,
  ReturnResponse,
} from '../../shared/handlers/error.utils';
import { ResultRepository } from './result.repository';
import { ClarisaInitiativesRepository } from '../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { YearsModule } from './years/years.module';
import { RoleByUserRepository } from '../../auth/modules/role-by-user/RoleByUser.repository';
import { LegacyResultModule } from './legacy-result/legacy-result.module';
import { ResultByLevelModule } from './result-by-level/result-by-level.module';
import { ClarisaInstitutionsRepository } from '../../clarisa/clarisa-institutions/ClariasaInstitutions.repository';
import { ClarisaInstitutionsTypeRepository } from '../../clarisa/clarisa-institutions-type/ClariasaInstitutionsType.repository';
import { PartnerDeliveryTypeModule } from './partner-delivery-type/partner-delivery-type.module';
import { ResultByInstitutionsByDeliveriesTypeModule } from './result-by-institutions-by-deliveries-type/result-by-institutions-by-deliveries-type.module';
import { ResultRegionsModule } from './result-regions/result-regions.module';
import { ResultCountriesModule } from './result-countries/result-countries.module';
import { LinkedResultsModule } from './linked-results/linked-results.module';
import { ResultsTocResultsModule } from './results-toc-results/results-toc-results.module';
import { NonPooledProjectsModule } from './non-pooled-projects/non-pooled-projects.module';
import { ResultsCentersModule } from './results-centers/results-centers.module';
import { ResultsKnowledgeProductsModule } from './results-knowledge-products/results-knowledge-products.module';
import { SummaryModule } from './summary/summary.module';
import { UnitsOfMeasureModule } from './units-of-measure/units-of-measure.module';
import { CapdevsTermsModule } from './capdevs-terms/capdevs-terms.module';
import { CapdevsDeliveryMethodsModule } from './capdevs-delivery-methods/capdevs-delivery-methods.module';
import { ResultsImpactAreaTargetModule } from './results-impact-area-target/results-impact-area-target.module';
import { ResultsImpactAreaIndicatorsModule } from './results-impact-area-indicators/results-impact-area-indicators.module';
import { ShareResultRequestModule } from './share-result-request/share-result-request.module';
import { LegacyIndicatorsLocationsModule } from './legacy_indicators_locations/legacy_indicators_locations.module';
import { LegacyIndicatorsPartnersModule } from './legacy_indicators_partners/legacy_indicators_partners.module';
import { ResultLegacyRepository } from './legacy-result/legacy-result.repository';
import { ElasticModule } from '../../elastic/elastic.module';
import { ElasticService } from '../../elastic/elastic.service';
import { KnowledgeProductFairBaselineModule } from './knowledge_product_fair_baseline/knowledge_product_fair_baseline.module';
import { OstMeliaStudiesModule } from './ost-melia-studies/ost-melia-studies.module';
import { ResultsValidationModuleModule } from './results-validation-module/results-validation-module.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { AdminPanelModule } from './admin-panel/admin-panel.module';
import { LogRepository } from '../../connection/dynamodb-logs/dynamodb-logs.repository';
import { ResultActorsModule } from './result-actors/result-actors.module';
import { ResultBudgetModule } from './result_budget/result_budget.module';
import { ResultCountriesSubNationalModule } from './result-countries-sub-national/result-countries-sub-national.module';
import { VersioningModule } from '../versioning/versioning.module';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';
import { ResultStatusModule } from './result-status/result-status.module';
import { ResultQuestionsService } from './result-questions/result-questions.service';
import { ResultQuestionsModule } from './result-questions/result-questions.module';
import { ResultQuestionsRepository } from './result-questions/repository/result-questions.repository';
import { ResultAnswerRepository } from './result-questions/repository/result-answers.repository';
import { InvestmentDiscontinuedOptionsModule } from './investment-discontinued-options/investment-discontinued-options.module';
import { ResultsInvestmentDiscontinuedOptionsModule } from './results-investment-discontinued-options/results-investment-discontinued-options.module';
import { ResultsInvestmentDiscontinuedOptionRepository } from './results-investment-discontinued-options/results-investment-discontinued-options.repository';
import { ResultInitiativeBudgetRepository } from './result_budget/repositories/result_initiative_budget.repository';
import { ResultFoldersModule } from './result-folders/result-folders.module';
import { AdUsersModule } from '../ad_users';
import { InitiativeEntityMapRepository } from '../initiative_entity_map/initiative_entity_map.repository';

@Module({
  controllers: [ResultsController],
  imports: [
    RouterModule.register(ResultsRoutes),
    ResultLevelsModule,
    ResultTypesModule,
    GenderTagLevelsModule,
    VersionsModule,
    InstitutionRolesModule,
    ResultsByInititiativesModule,
    ResultsByInstitutionsModule,
    ResultsByInstitutionTypesModule,
    EvidencesModule,
    ResultsByEvidencesModule,
    EvidenceTypesModule,
    InitiativeRolesModule,
    AuthModule,
    YearsModule,
    LegacyResultModule,
    ResultByLevelModule,
    PartnerDeliveryTypeModule,
    ResultByInstitutionsByDeliveriesTypeModule,
    ResultRegionsModule,
    ResultCountriesModule,
    LinkedResultsModule,
    ResultsTocResultsModule,
    NonPooledProjectsModule,
    ResultsCentersModule,
    ResultsKnowledgeProductsModule,
    SummaryModule,
    UnitsOfMeasureModule,
    CapdevsTermsModule,
    CapdevsDeliveryMethodsModule,
    ResultsImpactAreaTargetModule,
    ResultsImpactAreaIndicatorsModule,
    ShareResultRequestModule,
    LegacyIndicatorsLocationsModule,
    LegacyIndicatorsPartnersModule,
    ElasticModule,
    KnowledgeProductFairBaselineModule,
    OstMeliaStudiesModule,
    ResultsValidationModuleModule,
    SubmissionsModule,
    forwardRef(() => AdminPanelModule),
    ResultActorsModule,
    ResultBudgetModule,
    ResultCountriesSubNationalModule,
    VersioningModule,
    ResultStatusModule,
    ResultQuestionsModule,
    InvestmentDiscontinuedOptionsModule,
    ResultsInvestmentDiscontinuedOptionsModule,
    ResultFoldersModule,
    AdUsersModule,
  ],
  providers: [
    ResultsService,
    JwtMiddleware,
    HandlersError,
    ResultRepository,
    ClarisaInitiativesRepository,
    RoleByUserRepository,
    ClarisaInstitutionsRepository,
    ClarisaInstitutionsTypeRepository,
    ResultLegacyRepository,
    ElasticService,
    LogRepository,
    ReturnResponse,
    ResponseInterceptor,
    ResultQuestionsService,
    ResultQuestionsRepository,
    ResultAnswerRepository,
    ResultsInvestmentDiscontinuedOptionRepository,
    ResultInitiativeBudgetRepository,
    InitiativeEntityMapRepository,
  ],
  exports: [ResultRepository, JwtMiddleware],
})
export class ResultsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtMiddleware).forRoutes(
      {
        path: '/api/results/*',
        method: RequestMethod.ALL,
      },
      {
        path: '/api/clarisa/*',
        method: RequestMethod.ALL,
      },
      {
        path: '/api/ipsr/*',
        method: RequestMethod.ALL,
      },
      {
        path: '/logs/*',
        method: RequestMethod.ALL,
      },
    );
  }
}
