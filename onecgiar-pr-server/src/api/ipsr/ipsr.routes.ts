import { Routes } from '@nestjs/core';
import { InnovationPathwayModule } from './innovation-pathway/innovation-pathway.module';
import { ResultInnovationPackageModule } from './result-innovation-package/result-innovation-package.module';
import { ResultsPackageTocResultModule } from './results-package-toc-result/results-package-toc-result.module';
import { InnovationPackagingExpertsModule } from './innovation-packaging-experts/innovation-packaging-experts.module';
import { ResultsInnovationPackagesValidationModuleModule } from './results-innovation-packages-validation-module/results-innovation-packages-validation-module.module';
import { ResultsInnovationPackagesEnablerTypeModule } from './results-innovation-packages-enabler-type/results-innovation-packages-enabler-type.module';

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
  },
  {
    path: 'innovation-packaging-experts',
    module: InnovationPackagingExpertsModule
  },
  {
    path: 'results-innovation-packages-validation-module',
    module: ResultsInnovationPackagesValidationModuleModule
  },
  {
    path: 'results-innovation-packages-enabler-type',
    module: ResultsInnovationPackagesEnablerTypeModule
  },
];
