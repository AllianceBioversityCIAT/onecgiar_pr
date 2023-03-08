import { Module } from '@nestjs/common';
import { ResultsPackageByInitiativesService } from './results-package-by-initiatives.service';
import { ResultsPackageByInitiativesController } from './results-package-by-initiatives.controller';
import { ResultsPackageByInitiativeRepository } from './results-package-by-initiatives.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Module({
  controllers: [ResultsPackageByInitiativesController],
  providers: [ResultsPackageByInitiativesService, ResultsPackageByInitiativeRepository, HandlersError],
  exports: [ResultsPackageByInitiativeRepository]
})
export class ResultsPackageByInitiativesModule {}
