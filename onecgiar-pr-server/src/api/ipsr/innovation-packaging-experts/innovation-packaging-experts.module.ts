import { Module } from '@nestjs/common';
import { InnovationPackagingExpertsService } from './innovation-packaging-experts.service';
import { InnovationPackagingExpertsController } from './innovation-packaging-experts.controller';

@Module({
  controllers: [InnovationPackagingExpertsController],
  providers: [InnovationPackagingExpertsService]
})
export class InnovationPackagingExpertsModule {}
