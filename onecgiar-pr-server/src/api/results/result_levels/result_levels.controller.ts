import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ResultLevelsService } from './result_levels.service';
import { CreateResultLevelDto } from './dto/create-result_level.dto';
import { UpdateResultLevelDto } from './dto/update-result_level.dto';

@Controller('result-levels')
export class ResultLevelsController {
  constructor(private readonly resultLevelsService: ResultLevelsService) {}

  @Post()
  create(@Body() createResultLevelDto: CreateResultLevelDto) {
    return this.resultLevelsService.create(createResultLevelDto);
  }

  @Get()
  findAll() {
    return this.resultLevelsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultLevelsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateResultLevelDto: UpdateResultLevelDto) {
    return this.resultLevelsService.update(+id, updateResultLevelDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultLevelsService.remove(+id);
  }
}
