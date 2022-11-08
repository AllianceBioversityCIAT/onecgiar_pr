import { Module } from '@nestjs/common';
import { TocResultsService } from './toc-results.service';
import { TocResultsController } from './toc-results.controller';
import { TocResultsRepository } from './toc-results.repository';

@Module({
  controllers: [TocResultsController],
  providers: [TocResultsService, TocResultsRepository],
  exports: [
    TocResultsRepository
  ]
})
export class TocResultsModule {}
