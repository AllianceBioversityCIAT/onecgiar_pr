import { Module } from '@nestjs/common';
import { ResultsPackageTocResultService } from './results-package-toc-result.service';
import { ResultsPackageTocResultController } from './results-package-toc-result.controller';
import { ResultsPackageTocResultRepository } from './results-package-toc-result.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { NonPooledPackageProjectRepository } from '../non-pooled-package-projects/non-pooled-package-projects.repository';
import { ResultRepository } from '../../results/result.repository';
import { VersionsService } from '../../results/versions/versions.service';
import { VersionRepository } from '../../results/versions/version.repository';
import { ResultInnovationPackageRepository } from '../result-innovation-package/result-innovation-package.repository';
import { ResultsPackageCenterRepository } from '../results-package-centers/results-package-centers.repository';

@Module({
  controllers: [ResultsPackageTocResultController],
  providers: [
    ResultsPackageTocResultService, 
    ResultsPackageTocResultRepository, 
    NonPooledPackageProjectRepository,
    ResultInnovationPackageRepository,
    ResultRepository, 
    VersionsService,
    VersionRepository,
    ResultsPackageCenterRepository,
    HandlersError],
  exports: [ResultsPackageTocResultRepository]
})
export class ResultsPackageTocResultModule {}
