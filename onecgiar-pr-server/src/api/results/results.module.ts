import {
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
import { HandlersError } from '../../shared/handlers/error.utils';
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
import { TocResult } from '../../toc/toc-results/entities/toc-result.entity';
import { TocLevel } from '../../toc/toc-level/entities/toc-level.entity';
import { SummaryModule } from './summary/summary.module';
import { UnitsOfMeasureModule } from './units-of-measure/units-of-measure.module';
import { CapdevsTermsModule } from './capdevs-terms/capdevs-terms.module';
import { CapdevsDeliveryMethodsModule } from './capdevs-delivery-methods/capdevs-delivery-methods.module';
import { ResultsImpactAreaTargetModule } from './results-impact-area-target/results-impact-area-target.module';
import { ResultsImpactAreaIndicatorsModule } from './results-impact-area-indicators/results-impact-area-indicators.module';
import { ShareResultRequestModule } from './share-result-request/share-result-request.module';
import { LegacyIndicatorsLocationsModule } from './legacy_indicators_locations/legacy_indicators_locations.module';
import { LegacyIndicatorsPartnersModule } from './legacy_indicators_partners/legacy_indicators_partners.module';

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
    );
  }
}
