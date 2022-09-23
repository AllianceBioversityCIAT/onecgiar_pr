import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PermissionByRoleService } from './permission-by-role.service';
import { CreatePermissionByRoleDto } from './dto/create-permission-by-role.dto';
import { UpdatePermissionByRoleDto } from './dto/update-permission-by-role.dto';

@Controller('permission-by-role')
export class PermissionByRoleController {
  constructor(private readonly permissionByRoleService: PermissionByRoleService) {}

  @Post()
  create(@Body() createPermissionByRoleDto: CreatePermissionByRoleDto) {
    return this.permissionByRoleService.create(createPermissionByRoleDto);
  }

  @Get()
  findAll() {
    return this.permissionByRoleService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.permissionByRoleService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePermissionByRoleDto: UpdatePermissionByRoleDto) {
    return this.permissionByRoleService.update(+id, updatePermissionByRoleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.permissionByRoleService.remove(+id);
  }
}
