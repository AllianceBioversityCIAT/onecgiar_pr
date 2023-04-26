import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ResultsInnovationPackagesValidationModuleService } from './results-innovation-packages-validation-module.service';
import { CreateResultsInnovationPackagesValidationModuleDto } from './dto/create-results-innovation-packages-validation-module.dto';
import { UpdateResultsInnovationPackagesValidationModuleDto } from './dto/update-results-innovation-packages-validation-module.dto';

@Controller('results-innovation-packages-validation-module')
export class ResultsInnovationPackagesValidationModuleController {
  constructor(private readonly resultsInnovationPackagesValidationModuleService: ResultsInnovationPackagesValidationModuleService) {}

  @Post()
  create(@Body() createResultsInnovationPackagesValidationModuleDto: CreateResultsInnovationPackagesValidationModuleDto) {
    return this.resultsInnovationPackagesValidationModuleService.create(createResultsInnovationPackagesValidationModuleDto);
  }

  @Get()
  findAll() {
    return this.resultsInnovationPackagesValidationModuleService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultsInnovationPackagesValidationModuleService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateResultsInnovationPackagesValidationModuleDto: UpdateResultsInnovationPackagesValidationModuleDto) {
    return this.resultsInnovationPackagesValidationModuleService.update(+id, updateResultsInnovationPackagesValidationModuleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultsInnovationPackagesValidationModuleService.remove(+id);
  }
}
