import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ResultsInnovationPackagesEnablerTypeService } from './results-innovation-packages-enabler-type.service';
import { CreateResultsInnovationPackagesEnablerTypeDto } from './dto/create-results-innovation-packages-enabler-type.dto';
import { UpdateResultsInnovationPackagesEnablerTypeDto } from './dto/update-results-innovation-packages-enabler-type.dto';

@Controller()
export class ResultsInnovationPackagesEnablerTypeController {
  constructor(
    private readonly resultsInnovationPackagesEnablerTypeService: ResultsInnovationPackagesEnablerTypeService,
  ) {}

  @Post('createInnovationEnablers')
  create(
    @Body()
    createResultsInnovationPackagesEnablerTypeDto: CreateResultsInnovationPackagesEnablerTypeDto[],
  ) {
    return this.resultsInnovationPackagesEnablerTypeService.create(
      createResultsInnovationPackagesEnablerTypeDto,
    );
  }

  @Get()
  findAll() {
    return this.resultsInnovationPackagesEnablerTypeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultsInnovationPackagesEnablerTypeService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    updateResultsInnovationPackagesEnablerTypeDto: UpdateResultsInnovationPackagesEnablerTypeDto,
  ) {
    return this.resultsInnovationPackagesEnablerTypeService.update(
      +id,
      updateResultsInnovationPackagesEnablerTypeDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultsInnovationPackagesEnablerTypeService.remove(+id);
  }
}
