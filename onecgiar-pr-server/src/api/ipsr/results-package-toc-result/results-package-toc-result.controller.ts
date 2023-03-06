import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ResultsPackageTocResultService } from './results-package-toc-result.service';
import { CreateResultsPackageTocResultDto } from './dto/create-results-package-toc-result.dto';
import { UpdateResultsPackageTocResultDto } from './dto/update-results-package-toc-result.dto';

@Controller('results-package-toc-result')
export class ResultsPackageTocResultController {
  constructor(private readonly resultsPackageTocResultService: ResultsPackageTocResultService) {}

  @Post()
  create(@Body() createResultsPackageTocResultDto: CreateResultsPackageTocResultDto) {
    return this.resultsPackageTocResultService.create(createResultsPackageTocResultDto);
  }

  @Get()
  findAll() {
    return this.resultsPackageTocResultService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultsPackageTocResultService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateResultsPackageTocResultDto: UpdateResultsPackageTocResultDto) {
    return this.resultsPackageTocResultService.update(+id, updateResultsPackageTocResultDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultsPackageTocResultService.remove(+id);
  }
}
