import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseInterceptors,
} from '@nestjs/common';
import { ResultsInnovationPackagesEnablerTypeService } from './results-innovation-packages-enabler-type.service';
import { CreateResultsInnovationPackagesEnablerTypeDto } from './dto/create-results-innovation-packages-enabler-type.dto';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
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
}
