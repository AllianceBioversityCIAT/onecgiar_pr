import { Module } from '@nestjs/common';
import { ResultsPackageByInitiativesService } from './results-package-by-initiatives.service';
import { ResultsPackageByInitiativesController } from './results-package-by-initiatives.controller';

@Module({
  controllers: [ResultsPackageByInitiativesController],
  providers: [ResultsPackageByInitiativesService]
})
export class ResultsPackageByInitiativesModule {}
