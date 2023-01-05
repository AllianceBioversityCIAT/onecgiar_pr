import { Module } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { SubmissionsController } from './submissions.controller';
import { submissionRepository } from './submissions.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultRepository } from '../result.repository';
import { resultValidationRepository } from '../results-validation-module/results-validation-module.repository';

@Module({
  controllers: [SubmissionsController],
  providers: [SubmissionsService, submissionRepository, ResultRepository, resultValidationRepository, HandlersError],
  exports: [
    submissionRepository
  ]
})
export class SubmissionsModule {}
