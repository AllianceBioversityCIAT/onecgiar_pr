import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ResultsTocResultsService } from './results-toc-results.service';
import { CreateResultsTocResultDto } from './dto/create-results-toc-result.dto';
import { UpdateResultsTocResultDto } from './dto/update-results-toc-result.dto';

@Controller('results-toc-results')
export class ResultsTocResultsController {
  constructor(private readonly resultsTocResultsService: ResultsTocResultsService) {}

  @Post()
  create(@Body() createResultsTocResultDto: CreateResultsTocResultDto) {
    return this.resultsTocResultsService.create(createResultsTocResultDto);
  }

  @Get()
  findAll() {
    return this.resultsTocResultsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultsTocResultsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateResultsTocResultDto: UpdateResultsTocResultDto) {
    return this.resultsTocResultsService.update(+id, updateResultsTocResultDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultsTocResultsService.remove(+id);
  }
}
