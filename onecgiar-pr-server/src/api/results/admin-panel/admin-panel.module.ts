import { forwardRef, Module } from '@nestjs/common';
import { AdminPanelService } from './admin-panel.service';
import { AdminPanelController } from './admin-panel.controller';
import { AdminPanelRepository } from './admin-panel.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsKnowledgeProductsService } from '../results-knowledge-products/results-knowledge-products.service';
import { ResultsKnowledgeProductsModule } from '../results-knowledge-products/results-knowledge-products.module';
import { ResultsModule } from '../results.module';
import { ResultRepository } from '../result.repository';
import { SummaryModule } from '../summary/summary.module';
import { ResultsPolicyChangesRepository } from '../summary/repositories/results-policy-changes.repository';
import { ResultsInnovationsUseRepository } from '../summary/repositories/results-innovations-use.repository';
import { ResultsCapacityDevelopmentsRepository } from '../summary/repositories/results-capacity-developments.repository';
import { ResultsInnovationsDevRepository } from '../summary/repositories/results-innovations-dev.repository';

@Module({
  imports: [
    ResultsKnowledgeProductsModule,
    forwardRef(() => ResultsModule),
    SummaryModule,
  ],
  controllers: [AdminPanelController],
  providers: [
    AdminPanelService,
    AdminPanelRepository,
    HandlersError,
    ResultRepository,
    ResultsKnowledgeProductsService,
    ResultsPolicyChangesRepository,
    ResultsInnovationsUseRepository,
    ResultsCapacityDevelopmentsRepository,
    ResultsInnovationsDevRepository,
  ],
  exports: [AdminPanelRepository],
})
export class AdminPanelModule {}
