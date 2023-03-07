import { Routes } from '@nestjs/core';
import { ResultInnovationPackageModule } from './result-innovation-package/result-innovation-package.module';

export const ipsrRoutes: Routes = [
  {
    path: 'results-innovation-package',
    module: ResultInnovationPackageModule,
  },
];
