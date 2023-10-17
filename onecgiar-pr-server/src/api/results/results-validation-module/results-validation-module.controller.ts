import { Controller, Get, Patch, Param, HttpException } from '@nestjs/common';
import { ResultsValidationModuleService } from './results-validation-module.service';

@Controller()
export class ResultsValidationModuleController {
  constructor(
    private readonly resultsValidationModuleService: ResultsValidationModuleService,
  ) {}

  @Get('get/green-checks/:resultId')
  async findAll(@Param('resultId') resultId: number) {
    const { message, response, status } =
      await this.resultsValidationModuleService.getGreenchecksByResult(
        resultId,
      );
    throw new HttpException({ message, response }, status);
  }

  @Patch('save/green-checks/:resultId')
  async saveGreenChecks(@Param('resultId') resultId: number) {
    const { message, response, status } =
      await this.resultsValidationModuleService.saveGreenCheck(resultId);
    throw new HttpException({ message, response }, status);
  }

  @Get('bulk')
  async bulk() {
    const { message, response, status } =
      await this.resultsValidationModuleService.saveAllGreenCheck();
    throw new HttpException({ message, response }, status);
  }
}
