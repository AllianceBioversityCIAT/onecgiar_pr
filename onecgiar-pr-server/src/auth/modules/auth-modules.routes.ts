import { Routes } from '@nestjs/core';
import { UserModule } from './user/user.module';
import { RoleModule } from './role/role.module';
import { RolesUserByAplicationModule } from './roles-user-by-aplication/roles-user-by-aplication.module';
import { ComplementaryDataUserModule } from './complementary-data-user/complementary-data-user.module';



export const AuthModulesRoutes: Routes = [
  {
    path: 'user',
    module: UserModule
  },
  {
    path: 'role',
    module: RoleModule
  },
  {
    path:'roles-user-by-aplication',
    module: RolesUserByAplicationModule
  },
  {
    path:'complementary-data-user',
    module: ComplementaryDataUserModule
  }
];
