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
import { TocResultsRepository } from './repositories/toc-work-packages.repository';
import { ContributionToIndicatorResultsRepository } from '../contribution-to-indicators/repositories/contribution-to-indicator-result.repository';
import { ResultsByProjectsModule } from '../results/results_by_projects/results_by_projects.module';
import { ResultsTocTargetIndicatorRepository } from '../results/results-toc-results/repositories/result-toc-result-target-indicator.repository';

@Module({
  imports: [
    ResultsModule,
    ResultsKnowledgeProductsModule,
    ResultsTocResultsModule,
    ShareResultRequestModule,
    ResultsByProjectsModule,
  ],
  controllers: [ResultsFrameworkReportingController],
  providers: [
    ResultsFrameworkReportingService,
    ClarisaInitiativesRepository,
    RoleByUserRepository,
    ClarisaGlobalUnitRepository,
    YearRepository,
    HandlersError,
    TocResultsRepository,
    ContributionToIndicatorResultsRepository,
    ResultsTocTargetIndicatorRepository,
  ],
})
export class ResultsFrameworkReportingModule {}
