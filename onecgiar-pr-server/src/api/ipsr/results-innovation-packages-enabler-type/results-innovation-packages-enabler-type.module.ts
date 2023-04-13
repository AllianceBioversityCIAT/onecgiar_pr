import { Module } from '@nestjs/common';
import { ResultsInnovationPackagesEnablerTypeService } from './results-innovation-packages-enabler-type.service';
import { ResultsInnovationPackagesEnablerTypeController } from './results-innovation-packages-enabler-type.controller';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsInnovationPackagesEnablerTypeRepository } from './repositories/results-innovation-packages-enabler-type.repository';

@Module({
  controllers: [ResultsInnovationPackagesEnablerTypeController],
  providers: [ResultsInnovationPackagesEnablerTypeService, ResultsInnovationPackagesEnablerTypeRepository, HandlersError]
})
export class ResultsInnovationPackagesEnablerTypeModule {}
