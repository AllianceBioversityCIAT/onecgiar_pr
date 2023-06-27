import { Module } from '@nestjs/common';
import { ResultsPackageByInitiativesService } from './results-package-by-initiatives.service';
import { ResultsPackageByInitiativesController } from './results-package-by-initiatives.controller';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';

@Module({
  controllers: [ResultsPackageByInitiativesController],
  providers: [
    ResultsPackageByInitiativesService,
    HandlersError,
    ReturnResponse,
  ],
  exports: [],
})
export class ResultsPackageByInitiativesModule {}
