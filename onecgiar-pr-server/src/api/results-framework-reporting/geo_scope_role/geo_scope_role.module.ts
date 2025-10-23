import { Module } from '@nestjs/common';
import { GeoScopeRoleService } from './geo_scope_role.service';
import { GeoScopeRoleController } from './geo_scope_role.controller';

@Module({
  controllers: [GeoScopeRoleController],
  providers: [GeoScopeRoleService],
})
export class GeoScopeRoleModule {}
