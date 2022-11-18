import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { NonPooledProjectsService } from './non-pooled-projects.service';
import { CreateNonPooledProjectDto } from './dto/create-non-pooled-project.dto';
import { UpdateNonPooledProjectDto } from './dto/update-non-pooled-project.dto';

@Controller()
export class NonPooledProjectsController {
  constructor(private readonly nonPooledProjectsService: NonPooledProjectsService) {}

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
  update(@Param('id') id: string, @Body() updateNonPooledProjectDto: UpdateNonPooledProjectDto) {
    return this.nonPooledProjectsService.update(+id, updateNonPooledProjectDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.nonPooledProjectsService.remove(+id);
  }
}
