import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ClarisaActionAreaOutcomesActionAreaService } from './clarisa-action-area-outcomes-action-area.service';
import { CreateClarisaActionAreaOutcomesActionAreaDto } from './dto/create-clarisa-action-area-outcomes-action-area.dto';
import { UpdateClarisaActionAreaOutcomesActionAreaDto } from './dto/update-clarisa-action-area-outcomes-action-area.dto';

@Controller('clarisa-action-area-outcomes-action-area')
export class ClarisaActionAreaOutcomesActionAreaController {
  constructor(private readonly clarisaActionAreaOutcomesActionAreaService: ClarisaActionAreaOutcomesActionAreaService) {}

  @Post()
  create(@Body() createClarisaActionAreaOutcomesActionAreaDto: CreateClarisaActionAreaOutcomesActionAreaDto) {
    return this.clarisaActionAreaOutcomesActionAreaService.create(createClarisaActionAreaOutcomesActionAreaDto);
  }

  @Get()
  findAll() {
    return this.clarisaActionAreaOutcomesActionAreaService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clarisaActionAreaOutcomesActionAreaService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClarisaActionAreaOutcomesActionAreaDto: UpdateClarisaActionAreaOutcomesActionAreaDto) {
    return this.clarisaActionAreaOutcomesActionAreaService.update(+id, updateClarisaActionAreaOutcomesActionAreaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clarisaActionAreaOutcomesActionAreaService.remove(+id);
  }
}
