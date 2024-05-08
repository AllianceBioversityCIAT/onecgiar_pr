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
import { RoleLevelsService } from './role-levels.service';
import { CreateRoleLevelDto } from './dto/create-role-level.dto';
import { UpdateRoleLevelDto } from './dto/update-role-level.dto';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class RoleLevelsController {
  constructor(private readonly roleLevelsService: RoleLevelsService) {}

  @Post()
  create(@Body() createRoleLevelDto: CreateRoleLevelDto) {
    return this.roleLevelsService.create(createRoleLevelDto);
  }

  @Get()
  findAll() {
    return this.roleLevelsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roleLevelsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateRoleLevelDto: UpdateRoleLevelDto,
  ) {
    return this.roleLevelsService.update(+id, updateRoleLevelDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.roleLevelsService.remove(+id);
  }
}
