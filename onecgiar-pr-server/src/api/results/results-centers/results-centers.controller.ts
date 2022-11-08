import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ResultsCentersService } from './results-centers.service';
import { CreateResultsCenterDto } from './dto/create-results-center.dto';
import { UpdateResultsCenterDto } from './dto/update-results-center.dto';

@Controller('results-centers')
export class ResultsCentersController {
  constructor(private readonly resultsCentersService: ResultsCentersService) {}

  @Post()
  create(@Body() createResultsCenterDto: CreateResultsCenterDto) {
    return this.resultsCentersService.create(createResultsCenterDto);
  }

  @Get()
  findAll() {
    return this.resultsCentersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultsCentersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateResultsCenterDto: UpdateResultsCenterDto) {
    return this.resultsCentersService.update(+id, updateResultsCenterDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultsCentersService.remove(+id);
  }
}
