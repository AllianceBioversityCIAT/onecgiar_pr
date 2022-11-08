import { Module } from '@nestjs/common';
import { TocResultsService } from './toc-results.service';
import { TocResultsController } from './toc-results.controller';

@Module({
  controllers: [TocResultsController],
  providers: [TocResultsService]
})
export class TocResultsModule {}
