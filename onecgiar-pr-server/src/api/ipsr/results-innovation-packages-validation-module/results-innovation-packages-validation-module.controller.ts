import { Controller, Get, Param, HttpException } from '@nestjs/common';
import { ResultsInnovationPackagesValidationModuleService } from './results-innovation-packages-validation-module.service';

@Controller()
export class ResultsInnovationPackagesValidationModuleController {
  constructor(
    private readonly resultsInnovationPackagesValidationModuleService: ResultsInnovationPackagesValidationModuleService,
  ) {}

  @Get('get/green-checks/:resultId')
  async findAll(@Param('resultId') resultId: number) {
    const { message, response, status } =
      await this.resultsInnovationPackagesValidationModuleService.getGreenchecksByinnovationPackage(
        resultId,
      );

    throw new HttpException({ message, response }, status);
  }
}
