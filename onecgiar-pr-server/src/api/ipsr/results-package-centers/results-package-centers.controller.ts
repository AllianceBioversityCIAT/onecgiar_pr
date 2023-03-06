import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ResultsPackageCentersService } from './results-package-centers.service';
import { CreateResultsPackageCenterDto } from './dto/create-results-package-center.dto';
import { UpdateResultsPackageCenterDto } from './dto/update-results-package-center.dto';

@Controller('results-package-centers')
export class ResultsPackageCentersController {
  constructor(private readonly resultsPackageCentersService: ResultsPackageCentersService) {}

  @Post()
  create(@Body() createResultsPackageCenterDto: CreateResultsPackageCenterDto) {
    return this.resultsPackageCentersService.create(createResultsPackageCenterDto);
  }

  @Get()
  findAll() {
    return this.resultsPackageCentersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultsPackageCentersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateResultsPackageCenterDto: UpdateResultsPackageCenterDto) {
    return this.resultsPackageCentersService.update(+id, updateResultsPackageCenterDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultsPackageCentersService.remove(+id);
  }
}
