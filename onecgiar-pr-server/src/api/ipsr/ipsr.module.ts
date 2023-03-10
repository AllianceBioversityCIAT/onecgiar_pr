import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { IpsrService } from './ipsr.service';
import { IpsrController } from './ipsr.controller';
import { NonPooledPackageProjectsModule } from './non-pooled-package-projects/non-pooled-package-projects.module';
import { ResultsPackageCentersModule } from './results-package-centers/results-package-centers.module';
import { ResultsPackageTocResultModule } from './results-package-toc-result/results-package-toc-result.module';
import { ResultsPackageByInitiativesModule } from './results-package-by-initiatives/results-package-by-initiatives.module';
import { ResultInnovationPackageModule } from './result-innovation-package/result-innovation-package.module';
import { ResultInnovationPackageCountriesModule } from './result-innovation-package-countries/result-innovation-package-countries.module';
import { ResultInnovationPackageRegionsModule } from './result-innovation-package-regions/result-innovation-package-regions.module';
import { RouterModule } from '@nestjs/core';
import { IpsrRoutes } from './ipsr.routes';
import { IpsrRepository } from './ipsr.repository';
import { HandlersError } from 'src/shared/handlers/error.utils';
import { ShareResultInnovationPackageRequestModule } from './share-result-innovation-package-request/share-result-innovation-package-request.module';

@Module({
  controllers: [IpsrController],
  providers: [IpsrService, IpsrRepository, HandlersError],
  imports: [RouterModule.register(IpsrRoutes), ResultInnovationPackageModule, ResultsPackageByInitiativesModule, ResultsPackageTocResultModule, ResultsPackageCentersModule, NonPooledPackageProjectsModule, ShareResultInnovationPackageRequestModule],
})
export class IpsrModule {}
