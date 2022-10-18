import { Module } from '@nestjs/common';
import { LegacyResultService } from './legacy-result.service';
import { LegacyResultController } from './legacy-result.controller';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultLegacyRepository } from './legacy-result.repository';

@Module({
  controllers: [LegacyResultController],
  providers: [LegacyResultService, HandlersError, ResultLegacyRepository],
  exports: [ResultLegacyRepository],
})
export class LegacyResultModule {}
