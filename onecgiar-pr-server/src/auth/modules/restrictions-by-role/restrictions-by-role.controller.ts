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
import { RestrictionsByRoleService } from './restrictions-by-role.service';
import { CreateRestrictionsByRoleDto } from './dto/create-restrictions-by-role.dto';
import { UpdateRestrictionsByRoleDto } from './dto/update-restrictions-by-role.dto';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Controller('restrictions-by-role')
@UseInterceptors(ResponseInterceptor)
export class RestrictionsByRoleController {
  constructor(
    private readonly restrictionsByRoleService: RestrictionsByRoleService,
  ) {}

  @Post()
  create(@Body() createRestrictionsByRoleDto: CreateRestrictionsByRoleDto) {
    return this.restrictionsByRoleService.create(createRestrictionsByRoleDto);
  }

  @Get()
  findAll() {
    return this.restrictionsByRoleService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.restrictionsByRoleService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateRestrictionsByRoleDto: UpdateRestrictionsByRoleDto,
  ) {
    return this.restrictionsByRoleService.update(
      +id,
      updateRestrictionsByRoleDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.restrictionsByRoleService.remove(+id);
  }
}
