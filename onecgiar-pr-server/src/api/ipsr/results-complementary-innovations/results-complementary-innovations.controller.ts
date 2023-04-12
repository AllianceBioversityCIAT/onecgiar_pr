import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ResultsComplementaryInnovationsService } from './results-complementary-innovations.service';
import { CreateResultsComplementaryInnovationDto } from './dto/create-results-complementary-innovation.dto';
import { UpdateResultsComplementaryInnovationDto } from './dto/update-results-complementary-innovation.dto';

@Controller('results-complementary-innovations')
export class ResultsComplementaryInnovationsController {
  constructor(private readonly resultsComplementaryInnovationsService: ResultsComplementaryInnovationsService) {}

  @Post()
  create(@Body() createResultsComplementaryInnovationDto: CreateResultsComplementaryInnovationDto) {
    return this.resultsComplementaryInnovationsService.create(createResultsComplementaryInnovationDto);
  }

  @Get()
  findAll() {
    return this.resultsComplementaryInnovationsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultsComplementaryInnovationsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateResultsComplementaryInnovationDto: UpdateResultsComplementaryInnovationDto) {
    return this.resultsComplementaryInnovationsService.update(+id, updateResultsComplementaryInnovationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultsComplementaryInnovationsService.remove(+id);
  }
}
