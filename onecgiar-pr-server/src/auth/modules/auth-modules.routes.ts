import { Routes } from '@nestjs/core';
import { UserModule } from './user/user.module';
import { RoleModule } from './role/role.module';
import { RoleByUserModule } from './role-by-user/role-by-user.module';
import { RoleLevelsModule } from './role-levels/role-levels.module';
import { RestrictionsByRoleModule } from './restrictions-by-role/restrictions-by-role.module';
import { RestrictionsModule } from './restrictions/restrictions.module';

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
  },
  {
    path: 'role-levels',
    module: RoleLevelsModule
  },
  {
    path: 'restrictions-by-role',
    module: RestrictionsByRoleModule
  },
  {
    path: 'restrictions',
    module: RestrictionsModule
  }
];
