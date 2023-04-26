import { Module } from '@nestjs/common';
import { ResultsInnovationPackagesValidationModuleService } from './results-innovation-packages-validation-module.service';
import { ResultsInnovationPackagesValidationModuleController } from './results-innovation-packages-validation-module.controller';

@Module({
  controllers: [ResultsInnovationPackagesValidationModuleController],
  providers: [ResultsInnovationPackagesValidationModuleService]
})
export class ResultsInnovationPackagesValidationModuleModule {}
