import { Module } from '@nestjs/common';
import { LinkedResultsService } from './linked-results.service';
import { LinkedResultsController } from './linked-results.controller';
import { LinkedResultRepository } from './linked-results.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultRepository } from '../result.repository';

@Module({
  controllers: [LinkedResultsController],
  providers: [LinkedResultsService, LinkedResultRepository, HandlersError, ResultRepository],
  exports: [
    LinkedResultRepository
  ]
})
export class LinkedResultsModule {}
