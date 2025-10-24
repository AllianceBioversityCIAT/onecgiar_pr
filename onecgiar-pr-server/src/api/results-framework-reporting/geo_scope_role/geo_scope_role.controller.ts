import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { GeoScopeRoleService } from './geo_scope_role.service';

@Controller('geo-scope-role')
export class GeoScopeRoleController {
  constructor(private readonly geoScopeRoleService: GeoScopeRoleService) {}

  @Get()
  findAll() {
    return this.geoScopeRoleService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.geoScopeRoleService.findOne(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.geoScopeRoleService.remove(+id);
  }
}
