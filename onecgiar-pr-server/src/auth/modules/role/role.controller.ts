import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Roles } from './roles.decorator';
import { RoleApp } from './role.enum';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Controller('/')
@UseInterceptors(ResponseInterceptor)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @Roles(RoleApp.Admin)
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.roleService.create(createRoleDto);
  }

  /**
   * P2-2043: `levelId` is optional. Called without it the endpoint answers exactly what it answered
   * before (Initiative roles), so no existing consumer changes. The User Management filters pass
   * `levelId=1` to get the Platform roles.
   */
  @Get()
  async findAll(@Query('levelId') levelId?: string): Promise<any> {
    const parsedLevelId = Number(levelId);
    const roles = await this.roleService.findAll(
      Number.isInteger(parsedLevelId) && parsedLevelId > 0
        ? parsedLevelId
        : undefined,
    );
    return {
      response: roles,
      statusCode: 200,
      message: 'Roles fetched successfully',
    };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roleService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.roleService.update(+id, updateRoleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.roleService.remove(+id);
  }
}
