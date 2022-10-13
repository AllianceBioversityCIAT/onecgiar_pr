import { Module } from '@nestjs/common';
import { LegacyResultService } from './legacy-result.service';
import { LegacyResultController } from './legacy-result.controller';

@Module({
  controllers: [LegacyResultController],
  providers: [LegacyResultService]
})
export class LegacyResultModule {}
