import { Routes } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { ClarisaRoutes } from './clarisa/clarisa.routes';
import { AuthModulesRoutes } from './auth/modules/auth-modules.routes';
import { ModulesRoutes } from './api/modules.routes';
import { TocRoutes } from './toc/toc.routes';
import { TocModule } from './toc/toc.module';

export const MainRoutes: Routes = [
  {
    path: 'api',
    children: ModulesRoutes,
  },
  {
    path: 'auth',
    module: AuthModule,
    children: AuthModulesRoutes,
  },
  {
    path: 'clarisa',
    children: ClarisaRoutes,
  },
  {
    path: 'toc',
    children: TocRoutes,
  }
];
