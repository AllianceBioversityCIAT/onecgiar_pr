import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
} from '@nestjs/common';
import { InitiativeRolesService } from './initiative_roles.service';
import { CreateInitiativeRoleDto } from './dto/create-initiative_role.dto';
import { UpdateInitiativeRoleDto } from './dto/update-initiative_role.dto';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Controller('initiative-roles')
@UseInterceptors(ResponseInterceptor)
export class InitiativeRolesController {
  constructor(
    private readonly initiativeRolesService: InitiativeRolesService,
  ) {}

  @Post()
  create(@Body() createInitiativeRoleDto: CreateInitiativeRoleDto) {
    return this.initiativeRolesService.create(createInitiativeRoleDto);
  }

  @Get('all')
  findAll() {
    return this.initiativeRolesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.initiativeRolesService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateInitiativeRoleDto: UpdateInitiativeRoleDto,
  ) {
    return this.initiativeRolesService.update(+id, updateInitiativeRoleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.initiativeRolesService.remove(+id);
  }
}
