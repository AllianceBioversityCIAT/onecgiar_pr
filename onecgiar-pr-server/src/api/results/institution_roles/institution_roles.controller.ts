import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { InstitutionRolesService } from './institution_roles.service';
import { CreateInstitutionRoleDto } from './dto/create-institution_role.dto';
import { UpdateInstitutionRoleDto } from './dto/update-institution_role.dto';

@Controller('/')
export class InstitutionRolesController {
  constructor(
    private readonly institutionRolesService: InstitutionRolesService,
  ) {}

  @Post()
  create(@Body() createInstitutionRoleDto: CreateInstitutionRoleDto) {
    return this.institutionRolesService.create(createInstitutionRoleDto);
  }

  @Get('all')
  findAll() {
    return this.institutionRolesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.institutionRolesService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateInstitutionRoleDto: UpdateInstitutionRoleDto,
  ) {
    return this.institutionRolesService.update(+id, updateInstitutionRoleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.institutionRolesService.remove(+id);
  }
}
