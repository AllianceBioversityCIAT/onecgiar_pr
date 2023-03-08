import { Module } from '@nestjs/common';
import { ResultsPackageCentersService } from './results-package-centers.service';
import { ResultsPackageCentersController } from './results-package-centers.controller';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsPackageCenterRepository } from './results-package-centers.repository';

@Module({
  controllers: [ResultsPackageCentersController],
  providers: [ResultsPackageCentersService, HandlersError, ResultsPackageCenterRepository],
  exports: [ResultsPackageCenterRepository]
})
export class ResultsPackageCentersModule {}
