import { Module } from '@nestjs/common';
import { ResultsInnovationPackagesValidationModuleService } from './results-innovation-packages-validation-module.service';
import { ResultsInnovationPackagesValidationModuleController } from './results-innovation-packages-validation-module.controller';
import { ResultsInnovationPackagesValidationModuleRepository } from './results-innovation-packages-validation-module.repository';
import { IpsrRepository } from '../ipsr.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultRepository } from '../../results/result.repository';

@Module({
  controllers: [ResultsInnovationPackagesValidationModuleController],
  providers: [
    ResultsInnovationPackagesValidationModuleService,
    ResultsInnovationPackagesValidationModuleRepository,
    IpsrRepository,
    ResultRepository,
    HandlersError
  ]
})
export class ResultsInnovationPackagesValidationModuleModule {}
