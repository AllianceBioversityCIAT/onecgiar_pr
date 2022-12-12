import { Module } from '@nestjs/common';
import { ResultsValidationModuleService } from './results-validation-module.service';
import { ResultsValidationModuleController } from './results-validation-module.controller';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { resultValidationRepository } from './results-validation-module.repository';
import { ResultRepository } from '../result.repository';

@Module({
  controllers: [ResultsValidationModuleController],
  providers: [ResultsValidationModuleService, HandlersError, resultValidationRepository, ResultRepository],
  exports: [
    resultValidationRepository
  ]
})
export class ResultsValidationModuleModule {}
