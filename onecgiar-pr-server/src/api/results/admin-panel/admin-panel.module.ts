import { forwardRef, Module } from '@nestjs/common';
import { AdminPanelService } from './admin-panel.service';
import { AdminPanelController } from './admin-panel.controller';
import { AdminPanelRepository } from './admin-panel.repository';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';
import { ResultsKnowledgeProductsService } from '../results-knowledge-products/results-knowledge-products.service';
import { ResultsKnowledgeProductsModule } from '../results-knowledge-products/results-knowledge-products.module';
import { ResultsModule } from '../results.module';
import { ResultRepository } from '../result.repository';
import { SummaryModule } from '../summary/summary.module';
import { ResultsPolicyChangesRepository } from '../summary/repositories/results-policy-changes.repository';
import { ResultsInnovationsUseRepository } from '../summary/repositories/results-innovations-use.repository';
import { ResultsCapacityDevelopmentsRepository } from '../summary/repositories/results-capacity-developments.repository';
import { ResultsInnovationsDevRepository } from '../summary/repositories/results-innovations-dev.repository';
import { VersioningModule } from '../../versioning/versioning.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PhaseInitiativeReportingAccess } from './entities/phase-initiative-reporting-access.entity';
import { Version } from '../../versioning/entities/version.entity';
import { ClarisaInitiative } from '../../../clarisa/clarisa-initiatives/entities/clarisa-initiative.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PhaseInitiativeReportingAccess,
      Version,
      ClarisaInitiative,
    ]),
    ResultsKnowledgeProductsModule,
    forwardRef(() => ResultsModule),
    SummaryModule,
    VersioningModule,
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
    ReturnResponse,
  ],
  exports: [AdminPanelRepository, AdminPanelService],
})
export class AdminPanelModule {}
