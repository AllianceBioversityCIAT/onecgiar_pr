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
import { NonPooledProjectsService } from './non-pooled-projects.service';
import { CreateNonPooledProjectDto } from './dto/create-non-pooled-project.dto';
import { UpdateNonPooledProjectDto } from './dto/update-non-pooled-project.dto';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';
import { NonPooledProject } from './entities/non-pooled-project.entity';
import { returnFormatService } from '../../../shared/extendsGlobalDTO/returnServices.dto';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class NonPooledProjectsController {
  constructor(
    private readonly nonPooledProjectsService: NonPooledProjectsService,
  ) {}

  @Post()
  create(@Body() createNonPooledProjectDto: CreateNonPooledProjectDto) {
    return this.nonPooledProjectsService.create(createNonPooledProjectDto);
  }

  @Get()
  findAll() {
    return this.nonPooledProjectsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.nonPooledProjectsService.findOne(+id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateNonPooledProjectDto: NonPooledProject,
  ): Promise<returnFormatService> {
    return await this.nonPooledProjectsService.update(
      +id,
      updateNonPooledProjectDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.nonPooledProjectsService.remove(+id);
  }
}
