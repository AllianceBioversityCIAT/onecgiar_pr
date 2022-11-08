import { Routes } from '@nestjs/core';
import { TocResult } from './toc-results/entities/toc-result.entity';
import { TocLevel } from './toc-level/entities/toc-level.entity';
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
