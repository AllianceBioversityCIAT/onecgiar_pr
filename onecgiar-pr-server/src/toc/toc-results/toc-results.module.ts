import { Module } from '@nestjs/common';
import { TocResultsService } from './toc-results.service';
import { TocResultsController } from './toc-results.controller';
import { TocResultsRepository } from './toc-results.repository';
import { HandlersError } from '../../shared/handlers/error.utils';

@Module({
  controllers: [TocResultsController],
  providers: [TocResultsService, TocResultsRepository, HandlersError],
  exports: [
    TocResultsRepository
  ]
})
export class TocResultsModule {}
