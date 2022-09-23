import { Module } from '@nestjs/common';
import { PermissionByRoleService } from './permission-by-role.service';
import { PermissionByRoleController } from './permission-by-role.controller';

@Module({
  controllers: [PermissionByRoleController],
  providers: [PermissionByRoleService]
})
export class PermissionByRoleModule {}
