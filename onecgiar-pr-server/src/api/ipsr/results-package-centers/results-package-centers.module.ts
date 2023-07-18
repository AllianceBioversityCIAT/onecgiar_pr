import { Module } from '@nestjs/common';
import { ResultsPackageCentersService } from './results-package-centers.service';
import { ResultsPackageCentersController } from './results-package-centers.controller';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';

@Module({
  controllers: [ResultsPackageCentersController],
  providers: [ResultsPackageCentersService, HandlersError, ReturnResponse],
  exports: [],
})
export class ResultsPackageCentersModule {}
