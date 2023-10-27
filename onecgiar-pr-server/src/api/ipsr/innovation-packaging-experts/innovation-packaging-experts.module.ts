import { Module } from '@nestjs/common';
import { InnovationPackagingExpertsService } from './innovation-packaging-experts.service';
import { InnovationPackagingExpertsController } from './innovation-packaging-experts.controller';
import { ExpertisesRepository } from './repositories/expertises.repository';
import { InnovationPackagingExpertRepository } from './repositories/innovation-packaging-expert.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Module({
  controllers: [InnovationPackagingExpertsController],
  providers: [
    InnovationPackagingExpertsService,
    ExpertisesRepository,
    InnovationPackagingExpertRepository,
    HandlersError,
  ],
  exports: [ExpertisesRepository, InnovationPackagingExpertRepository],
})
export class InnovationPackagingExpertsModule {}
