import { Controller, Get, Post, Body, Patch, Param, Delete, UseFilters, HttpException } from '@nestjs/common';
import { RoleByUserService } from './role-by-user.service';
import { CreateRoleByUserDto } from './dto/create-role-by-user.dto';
import { UpdateRoleByUserDto } from './dto/update-role-by-user.dto';
import { HttpExceptionFilter } from '../../../shared/handlers/error.exception';

@Controller()
@UseFilters(new HttpExceptionFilter())
export class RoleByUserController {
  constructor(private readonly roleByUserService: RoleByUserService) {}

  @Post()
  create(@Body() createRoleByUserDto: CreateRoleByUserDto) {
    return this.roleByUserService.create(createRoleByUserDto);
  }

  @Get('get/user/:id')
  async findAll(@Param('id') userId: number) {
    const {message, response, status} = await this.roleByUserService.allRolesByUser(userId);
    throw new HttpException({message,response}, status);
  }

  @Get('all')
  findOne(@Param('id') id: string) {
    return this.roleByUserService.getAllUsersAndRoles();
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
