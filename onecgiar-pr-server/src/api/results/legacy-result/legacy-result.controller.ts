import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { LegacyResultService } from './legacy-result.service';
import { CreateLegacyResultDto } from './dto/create-legacy-result.dto';
import { UpdateLegacyResultDto } from './dto/update-legacy-result.dto';

@Controller('legacy-result')
export class LegacyResultController {
  constructor(private readonly legacyResultService: LegacyResultService) {}

  @Post()
  create(@Body() createLegacyResultDto: CreateLegacyResultDto) {
    return this.legacyResultService.create(createLegacyResultDto);
  }

  @Get()
  findAll() {
    return this.legacyResultService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.legacyResultService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLegacyResultDto: UpdateLegacyResultDto) {
    return this.legacyResultService.update(+id, updateLegacyResultDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.legacyResultService.remove(+id);
  }
}
