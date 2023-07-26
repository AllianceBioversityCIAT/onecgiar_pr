import { Module } from '@nestjs/common';
import { TocResultsService } from './toc-results.service';
import { TocResultsController } from './toc-results.controller';
import { TocResultsRepository } from './toc-results.repository';
import {
  HandlersError,
  ReturnResponse,
} from '../../shared/handlers/error.utils';

@Module({
  controllers: [TocResultsController],
  providers: [
    TocResultsService,
    TocResultsRepository,
    HandlersError,
    ReturnResponse,
  ],
  exports: [TocResultsRepository],
})
export class TocResultsModule {}
