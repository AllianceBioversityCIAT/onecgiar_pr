import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ClarisaActionAreasService } from './clarisa-action-areas.service';
import { CreateClarisaActionAreaDto } from './dto/create-clarisa-action-area.dto';
import { UpdateClarisaActionAreaDto } from './dto/update-clarisa-action-area.dto';

@Controller()
export class ClarisaActionAreasController {
  constructor(private readonly clarisaActionAreasService: ClarisaActionAreasService) {}

  @Post()
  create(@Body() createClarisaActionAreaDto: CreateClarisaActionAreaDto) {
    return this.clarisaActionAreasService.create(createClarisaActionAreaDto);
  }

  @Get()
  findAll() {
    return this.clarisaActionAreasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clarisaActionAreasService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClarisaActionAreaDto: UpdateClarisaActionAreaDto) {
    return this.clarisaActionAreasService.update(+id, updateClarisaActionAreaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clarisaActionAreasService.remove(+id);
  }
}
