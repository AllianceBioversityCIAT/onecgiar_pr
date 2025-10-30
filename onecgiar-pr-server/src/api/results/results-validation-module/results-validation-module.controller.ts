import {
  Controller,
  Get,
  Patch,
  Param,
  UseInterceptors,
  Query,
} from '@nestjs/common';
import { ResultsValidationModuleService } from './results-validation-module.service';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';
import { ApiQuery } from '@nestjs/swagger';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ResultsValidationModuleController {
  constructor(
    private readonly resultsValidationModuleService: ResultsValidationModuleService,
  ) {}

  @ApiQuery({
    name: 'v',
    required: false,
    type: String,
    description: 'API version',
    enum: ['1', '2'],
  })
  @Get('get/green-checks/:resultId')
  findAll(@Param('resultId') resultId: number, @Query('v') version: string) {
    if (version === '2') {
      return this.resultsValidationModuleService.calculateValidationSections(
        resultId,
      );
    }
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
