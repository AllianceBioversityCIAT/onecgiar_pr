import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ResultsByInstitutionTypesService } from './results_by_institution_types.service';
import { CreateResultsByInstitutionTypeDto } from './dto/create-results_by_institution_type.dto';
import { UpdateResultsByInstitutionTypeDto } from './dto/update-results_by_institution_type.dto';

@Controller('results-by-institution-types')
export class ResultsByInstitutionTypesController {
  constructor(private readonly resultsByInstitutionTypesService: ResultsByInstitutionTypesService) {}

  @Post()
  create(@Body() createResultsByInstitutionTypeDto: CreateResultsByInstitutionTypeDto) {
    return this.resultsByInstitutionTypesService.create(createResultsByInstitutionTypeDto);
  }

  @Get()
  findAll() {
    return this.resultsByInstitutionTypesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultsByInstitutionTypesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateResultsByInstitutionTypeDto: UpdateResultsByInstitutionTypeDto) {
    return this.resultsByInstitutionTypesService.update(+id, updateResultsByInstitutionTypeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultsByInstitutionTypesService.remove(+id);
  }
}
