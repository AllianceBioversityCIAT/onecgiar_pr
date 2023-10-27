import { Routes } from '@nestjs/core';
import { TocResultsModule } from './toc-results/toc-results.module';
import { TocLevelModule } from './toc-level/toc-level.module';

export const TocRoutes: Routes = [
  {
    path: 'result',
    module: TocResultsModule,
  },
  {
    path: 'level',
    module: TocLevelModule,
  },
];
