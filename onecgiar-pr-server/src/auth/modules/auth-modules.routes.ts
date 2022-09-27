import { Routes } from '@nestjs/core';
import { UserModule } from './user/user.module';
import { RoleModule } from './role/role.module';

export const AuthModulesRoutes: Routes = [
  {
    path: 'user',
    module: UserModule,
  },
  {
    path: 'role',
    module: RoleModule,
  }
];
