import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ResultsIpInstitutionTypeService } from './results-ip-institution-type.service';
import { CreateResultsIpInstitutionTypeDto } from './dto/create-results-ip-institution-type.dto';
import { UpdateResultsIpInstitutionTypeDto } from './dto/update-results-ip-institution-type.dto';

@Controller('results-ip-institution-type')
export class ResultsIpInstitutionTypeController {
  constructor(
    private readonly resultsIpInstitutionTypeService: ResultsIpInstitutionTypeService,
  ) {}

  @Post()
  create(
    @Body()
    createResultsIpInstitutionTypeDto: CreateResultsIpInstitutionTypeDto,
  ) {
    return this.resultsIpInstitutionTypeService.create(
      createResultsIpInstitutionTypeDto,
    );
  }

  @Get()
  findAll() {
    return this.resultsIpInstitutionTypeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultsIpInstitutionTypeService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    updateResultsIpInstitutionTypeDto: UpdateResultsIpInstitutionTypeDto,
  ) {
    return this.resultsIpInstitutionTypeService.update(
      +id,
      updateResultsIpInstitutionTypeDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultsIpInstitutionTypeService.remove(+id);
  }
}
