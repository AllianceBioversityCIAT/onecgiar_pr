import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ResultsPackageByInitiativesService } from './results-package-by-initiatives.service';
import { CreateResultsPackageByInitiativeDto } from './dto/create-results-package-by-initiative.dto';
import { UpdateResultsPackageByInitiativeDto } from './dto/update-results-package-by-initiative.dto';

@Controller('results-package-by-initiatives')
export class ResultsPackageByInitiativesController {
  constructor(private readonly resultsPackageByInitiativesService: ResultsPackageByInitiativesService) {}

  @Post()
  create(@Body() createResultsPackageByInitiativeDto: CreateResultsPackageByInitiativeDto) {
    return this.resultsPackageByInitiativesService.create(createResultsPackageByInitiativeDto);
  }

  @Get()
  findAll() {
    return this.resultsPackageByInitiativesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultsPackageByInitiativesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateResultsPackageByInitiativeDto: UpdateResultsPackageByInitiativeDto) {
    return this.resultsPackageByInitiativesService.update(+id, updateResultsPackageByInitiativeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultsPackageByInitiativesService.remove(+id);
  }
}
