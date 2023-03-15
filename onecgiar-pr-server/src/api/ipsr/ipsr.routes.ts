import { Routes } from '@nestjs/core';
import { InnovationPathwayModule } from './innovation-pathway/innovation-pathway.module';
import { ResultInnovationPackageModule } from './result-innovation-package/result-innovation-package.module';
import { ResultsPackageTocResultModule } from './results-package-toc-result/results-package-toc-result.module';

export const IpsrRoutes: Routes = [
  {
    path: 'results-innovation-package',
    module: ResultInnovationPackageModule,
  },
  {
    path: 'contributors',
    module: ResultsPackageTocResultModule
  },
  {
    path: 'innovation-pathway',
    module: InnovationPathwayModule
  }
];
