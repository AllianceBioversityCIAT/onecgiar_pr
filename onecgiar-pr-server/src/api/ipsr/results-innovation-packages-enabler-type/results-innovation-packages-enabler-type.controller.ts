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
import {
  LockedWhileInQa,
  QA_REVIEW_LOCK_LOOKUPS,
} from '../../../shared/guards/qa-review-lock.guard';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ResultsInnovationPackagesEnablerTypeController {
  constructor(
    private readonly resultsInnovationPackagesEnablerTypeService: ResultsInnovationPackagesEnablerTypeService,
  ) {}

  @LockedWhileInQa({
    bodyArrayKey: 'result_by_innovation_package_id',
    lookup: QA_REVIEW_LOCK_LOOKUPS.resultByInnovationPackage,
  })
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
