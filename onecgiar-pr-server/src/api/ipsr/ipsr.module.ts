import { Module } from '@nestjs/common';
import { IpsrService } from './ipsr.service';
import { IpsrController } from './ipsr.controller';
import { ResultInnovationPackageModule } from './result-innovation-package/result-innovation-package.module';
import { NonPooledPackageProjectsModule } from './non-pooled-package-projects/non-pooled-package-projects.module';
import { ResultsPackageCentersModule } from './results-package-centers/results-package-centers.module';
import { ResultsPackageTocResultModule } from './results-package-toc-result/results-package-toc-result.module';
import { ResultsPackageByInitiativesModule } from './results-package-by-initiatives/results-package-by-initiatives.module';
import { ResultInnovationPackageModule } from './result-innovation-package/result-innovation-package.module';

@Module({
  controllers: [IpsrController],
  providers: [IpsrService],
  imports: [ResultInnovationPackageModule, ResultsPackageByInitiativesModule, ResultsPackageTocResultModule, ResultsPackageCentersModule, NonPooledPackageProjectsModule]
})
export class IpsrModule {}
