import { Routes } from '@nestjs/core';
import { ClarisaGlobalTargetModule } from './clarisa-global-target.module';

export const ClarisaGlobalTargetRoutes: Routes = [
  {
    path: '',
    module: ClarisaGlobalTargetModule,
  },
];
