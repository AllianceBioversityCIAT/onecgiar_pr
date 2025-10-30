import { Module } from '@nestjs/common';
import { ResultsFrameworkReportingService } from './results-framework-reporting.service';
import { ResultsFrameworkReportingController } from './results-framework-reporting.controller';
import { ClarisaInitiativesRepository } from '../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { RoleByUserRepository } from '../../auth/modules/role-by-user/RoleByUser.repository';
import { ClarisaGlobalUnitRepository } from '../../clarisa/clarisa-global-unit/clarisa-global-unit.repository';
import { YearRepository } from '../results/years/year.repository';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ResultsModule } from '../results/results.module';
import { ResultsKnowledgeProductsModule } from '../results/results-knowledge-products/results-knowledge-products.module';
import { ResultsTocResultsModule } from '../results/results-toc-results/results-toc-results.module';
import { ShareResultRequestModule } from '../results/share-result-request/share-result-request.module';
import { AoWBilateralRepository } from '../results/results-toc-results/repositories/aow-bilateral.repository';
import { ContributionToIndicatorResultsRepository } from '../contribution-to-indicators/repositories/contribution-to-indicator-result.repository';
import { ResultsByProjectsModule } from '../results/results_by_projects/results_by_projects.module';
import { ContributorsPartnersModule } from './contributors-partners/contributors-partners.module';
import { ResultsTocTargetIndicatorRepository } from '../results/results-toc-results/repositories/result-toc-result-target-indicator.repository';
import { GeographicLocationModule } from './geographic-location/geographic-location.module';
import { GeoScopeRoleModule } from './geo_scope_role/geo_scope_role.module';
import { InnovationDevModule } from './innovation_dev/innovation_dev.module';
import { InnovationUseModule } from './innovation-use/innovation-use.module';
import { ResultScalingStudyUrlsModule } from './result_scaling_study_urls/result_scaling_study_urls.module';
import { ResultInnovSectionModule } from './result_innov_section/result_innov_section.module';

@Module({
  imports: [
    ResultsModule,
    ResultsKnowledgeProductsModule,
    ResultsTocResultsModule,
    ShareResultRequestModule,
    ResultsByProjectsModule,
    ContributorsPartnersModule,
    GeographicLocationModule,
    GeoScopeRoleModule,
    InnovationDevModule,
    InnovationUseModule,
    ResultScalingStudyUrlsModule,
    ResultInnovSectionModule,
  ],
  controllers: [ResultsFrameworkReportingController],
  providers: [
    ResultsFrameworkReportingService,
    ClarisaInitiativesRepository,
    RoleByUserRepository,
    ClarisaGlobalUnitRepository,
    YearRepository,
    HandlersError,
    AoWBilateralRepository,
    ContributionToIndicatorResultsRepository,
    ResultsTocTargetIndicatorRepository,
  ],
})
export class ResultsFrameworkReportingModule {}
