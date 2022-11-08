import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ClarisaInnovationReadinessLevelsService } from './clarisa-innovation-readiness-levels.service';
import { CreateClarisaInnovationReadinessLevelDto } from './dto/create-clarisa-innovation-readiness-level.dto';
import { UpdateClarisaInnovationReadinessLevelDto } from './dto/update-clarisa-innovation-readiness-level.dto';

@Controller('clarisa-innovation-readiness-levels')
export class ClarisaInnovationReadinessLevelsController {
  constructor(private readonly clarisaInnovationReadinessLevelsService: ClarisaInnovationReadinessLevelsService) {}

  @Post()
  create(@Body() createClarisaInnovationReadinessLevelDto: CreateClarisaInnovationReadinessLevelDto) {
    return this.clarisaInnovationReadinessLevelsService.create(createClarisaInnovationReadinessLevelDto);
  }

  @Get()
  findAll() {
    return this.clarisaInnovationReadinessLevelsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clarisaInnovationReadinessLevelsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClarisaInnovationReadinessLevelDto: UpdateClarisaInnovationReadinessLevelDto) {
    return this.clarisaInnovationReadinessLevelsService.update(+id, updateClarisaInnovationReadinessLevelDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clarisaInnovationReadinessLevelsService.remove(+id);
  }
}
