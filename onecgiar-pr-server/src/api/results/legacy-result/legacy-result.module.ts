import { Module } from '@nestjs/common';
import { LegacyResultService } from './legacy-result.service';
import { LegacyResultController } from './legacy-result.controller';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';
import { ResultLegacyRepository } from './legacy-result.repository';

@Module({
  controllers: [LegacyResultController],
  providers: [
    LegacyResultService,
    HandlersError,
    ResultLegacyRepository,
    ReturnResponse,
  ],
  exports: [ResultLegacyRepository],
})
export class LegacyResultModule {}
