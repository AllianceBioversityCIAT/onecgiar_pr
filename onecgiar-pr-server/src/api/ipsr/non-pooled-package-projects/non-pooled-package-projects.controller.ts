import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { NonPooledPackageProjectsService } from './non-pooled-package-projects.service';
import { CreateNonPooledPackageProjectDto } from './dto/create-non-pooled-package-project.dto';
import { UpdateNonPooledPackageProjectDto } from './dto/update-non-pooled-package-project.dto';

@Controller('non-pooled-package-projects')
export class NonPooledPackageProjectsController {
  constructor(private readonly nonPooledPackageProjectsService: NonPooledPackageProjectsService) {}

  @Post()
  create(@Body() createNonPooledPackageProjectDto: CreateNonPooledPackageProjectDto) {
    return this.nonPooledPackageProjectsService.create(createNonPooledPackageProjectDto);
  }

  @Get()
  findAll() {
    return this.nonPooledPackageProjectsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.nonPooledPackageProjectsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateNonPooledPackageProjectDto: UpdateNonPooledPackageProjectDto) {
    return this.nonPooledPackageProjectsService.update(+id, updateNonPooledPackageProjectDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.nonPooledPackageProjectsService.remove(+id);
  }
}
