import {
  Controller,
  Get,
  Patch,
  Param,
  HttpException,
  UseInterceptors,
} from '@nestjs/common';
import { ResultsValidationModuleService } from './results-validation-module.service';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ResultsValidationModuleController {
  constructor(
    private readonly resultsValidationModuleService: ResultsValidationModuleService,
  ) {}

  @Get('get/green-checks/:resultId')
  findAll(@Param('resultId') resultId: number) {
    return this.resultsValidationModuleService.getGreenchecksByResult(resultId);
  }

  @Patch('save/green-checks/:resultId')
  saveGreenChecks(@Param('resultId') resultId: number) {
    return this.resultsValidationModuleService.saveGreenCheck(resultId);
  }

  @Get('bulk')
  bulk() {
    return this.resultsValidationModuleService.saveAllGreenCheck();
  }
}
