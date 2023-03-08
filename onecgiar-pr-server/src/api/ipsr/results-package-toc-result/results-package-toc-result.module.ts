import { Module } from '@nestjs/common';
import { ResultsPackageTocResultService } from './results-package-toc-result.service';
import { ResultsPackageTocResultController } from './results-package-toc-result.controller';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultRepository } from '../../results/result.repository';
import { VersionsService } from '../../results/versions/versions.service';
import { VersionRepository } from '../../results/versions/version.repository';

@Module({
  controllers: [ResultsPackageTocResultController],
  providers: [
    ResultsPackageTocResultService, 
    ResultRepository, 
    VersionsService,
    VersionRepository,
    HandlersError],
  exports: []
})
export class ResultsPackageTocResultModule {}
