import { Module } from '@nestjs/common';
import { ResultsTocResultsService } from './results-toc-results.service';
import { ResultsTocResultsController } from './results-toc-results.controller';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsTocResultRepository } from './results-toc-results.repository';

@Module({
  controllers: [ResultsTocResultsController],
  providers: [ResultsTocResultsService, HandlersError, ResultsTocResultRepository],
  exports: [
    ResultsTocResultRepository
  ]
})
export class ResultsTocResultsModule {}
