import { Module } from '@nestjs/common';
import { LinkedResultsService } from './linked-results.service';
import { LinkedResultsController } from './linked-results.controller';
import { LinkedResultRepository } from './linked-results.repository';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';
import { ResultRepository } from '../result.repository';
import { VersionRepository } from '../../versioning/versioning.repository';
import { VersionsService } from '../versions/versions.service';

@Module({
  controllers: [LinkedResultsController],
  providers: [
    LinkedResultsService,
    LinkedResultRepository,
    HandlersError,
    ResultRepository,
    VersionsService,
    VersionRepository,
    ReturnResponse,
  ],
  exports: [LinkedResultRepository],
})
export class LinkedResultsModule {}
