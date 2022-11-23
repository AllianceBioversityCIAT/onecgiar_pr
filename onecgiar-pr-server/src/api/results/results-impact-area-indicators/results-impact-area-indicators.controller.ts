import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ResultsImpactAreaIndicatorsService } from './results-impact-area-indicators.service';
import { CreateResultsImpactAreaIndicatorDto } from './dto/create-results-impact-area-indicator.dto';
import { UpdateResultsImpactAreaIndicatorDto } from './dto/update-results-impact-area-indicator.dto';

@Controller()
export class ResultsImpactAreaIndicatorsController {
  constructor(private readonly resultsImpactAreaIndicatorsService: ResultsImpactAreaIndicatorsService) {}

  @Post()
  create(@Body() createResultsImpactAreaIndicatorDto: CreateResultsImpactAreaIndicatorDto) {
    return this.resultsImpactAreaIndicatorsService.create(createResultsImpactAreaIndicatorDto);
  }

  @Get()
  findAll() {
    return this.resultsImpactAreaIndicatorsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultsImpactAreaIndicatorsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateResultsImpactAreaIndicatorDto: UpdateResultsImpactAreaIndicatorDto) {
    return this.resultsImpactAreaIndicatorsService.update(+id, updateResultsImpactAreaIndicatorDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultsImpactAreaIndicatorsService.remove(+id);
  }
}
