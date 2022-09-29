import { Routes } from '@nestjs/core';
import { UserModule } from './user/user.module';
import { RoleModule } from './role/role.module';
import { RoleByUserModule } from './role-by-user/role-by-user.module';

export const AuthModulesRoutes: Routes = [
  {
    path: 'user',
    module: UserModule,
  },
  {
    path: 'role',
    module: RoleModule,
  },
  {
    path: 'role-by-user',
    module: RoleByUserModule
  }
];
