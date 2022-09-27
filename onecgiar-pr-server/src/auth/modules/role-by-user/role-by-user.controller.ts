import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RoleByUserService } from './role-by-user.service';
import { CreateRoleByUserDto } from './dto/create-role-by-user.dto';
import { UpdateRoleByUserDto } from './dto/update-role-by-user.dto';

@Controller('role-by-user')
export class RoleByUserController {
  constructor(private readonly roleByUserService: RoleByUserService) {}

  @Post()
  create(@Body() createRoleByUserDto: CreateRoleByUserDto) {
    return this.roleByUserService.create(createRoleByUserDto);
  }

  @Get()
  findAll() {
    return this.roleByUserService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roleByUserService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRoleByUserDto: UpdateRoleByUserDto) {
    return this.roleByUserService.update(+id, updateRoleByUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.roleByUserService.remove(+id);
  }
}
