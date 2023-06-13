import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { VersioningService } from './versioning.service';
import { CreateVersioningDto } from './dto/create-versioning.dto';
import { UpdateVersioningDto } from './dto/update-versioning.dto';

@Controller('versioning')
export class VersioningController {
  constructor(private readonly versioningService: VersioningService) {}

  @Post()
  create(@Body() createVersioningDto: CreateVersioningDto) {
    return this.versioningService.create(createVersioningDto);
  }

  @Get()
  findAll() {
    return this.versioningService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.versioningService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateVersioningDto: UpdateVersioningDto) {
    return this.versioningService.update(+id, updateVersioningDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.versioningService.remove(+id);
  }
}
