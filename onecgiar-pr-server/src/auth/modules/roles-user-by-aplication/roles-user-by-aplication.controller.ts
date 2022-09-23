import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { RolesUserByAplicationService } from './roles-user-by-aplication.service';
import { CreateRolesUserByAplicationDto } from './dto/create-roles-user-by-aplication.dto';
import { UpdateRolesUserByAplicationDto } from './dto/update-roles-user-by-aplication.dto';

@Controller()
export class RolesUserByAplicationController {
  constructor(
    private readonly rolesUserByAplicationService: RolesUserByAplicationService,
  ) {}

  @Post()
  create(
    @Body() createRolesUserByAplicationDto: CreateRolesUserByAplicationDto,
  ) {
    return 1;
  }

  @Get()
  findAll() {
    return this.rolesUserByAplicationService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rolesUserByAplicationService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateRolesUserByAplicationDto: UpdateRolesUserByAplicationDto,
  ) {
    return this.rolesUserByAplicationService.update(
      +id,
      updateRolesUserByAplicationDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.rolesUserByAplicationService.remove(+id);
  }
}
