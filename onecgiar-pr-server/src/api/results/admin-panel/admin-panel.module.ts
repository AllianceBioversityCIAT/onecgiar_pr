import { Module } from '@nestjs/common';
import { AdminPanelService } from './admin-panel.service';
import { AdminPanelController } from './admin-panel.controller';
import { AdminPanelRepository } from './admin-panel.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsKnowledgeProductsService } from '../results-knowledge-products/results-knowledge-products.service';
import { ResultsKnowledgeProductsModule } from '../results-knowledge-products/results-knowledge-products.module';

@Module({
  controllers: [AdminPanelController],
  providers: [
    AdminPanelService,
    AdminPanelRepository,
    HandlersError,
    ResultsKnowledgeProductsService,
  ],
  exports: [AdminPanelRepository],
  imports: [ResultsKnowledgeProductsModule],
})
export class AdminPanelModule {}
