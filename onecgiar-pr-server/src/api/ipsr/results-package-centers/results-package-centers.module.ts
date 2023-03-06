import { Module } from '@nestjs/common';
import { ResultsPackageCentersService } from './results-package-centers.service';
import { ResultsPackageCentersController } from './results-package-centers.controller';

@Module({
  controllers: [ResultsPackageCentersController],
  providers: [ResultsPackageCentersService]
})
export class ResultsPackageCentersModule {}
