import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { ResultsInnovationPackagesValidationModuleService } from './results-innovation-packages-validation-module.service';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ResultsInnovationPackagesValidationModuleController {
  constructor(
    private readonly resultsInnovationPackagesValidationModuleService: ResultsInnovationPackagesValidationModuleService,
  ) {}

  @Get('get/green-checks/:resultId')
  findAll(@Param('resultId') resultId: number) {
    return this.resultsInnovationPackagesValidationModuleService.getGreenchecksByinnovationPackage(
      resultId,
    );
  }
}
