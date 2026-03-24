import {
  Controller,
  Get,
  Param,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { ResultQuestionsService } from './result-questions.service';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ResultQuestionsController {
  constructor(
    private readonly resultQuestionsService: ResultQuestionsService,
  ) {}

  @Get('policy-change/:resultId')
  findQuestionPolicyChange(@Param('resultId') resultId: number) {
    return this.resultQuestionsService.findQuestionPolicyChange(resultId);
  }

  @Get('innovation-development/:resultId')
  findQuestionInnovationDevelopment(@Param('resultId') resultId: number) {
    return this.resultQuestionsService.findQuestionInnovationDevelopment(
      resultId,
    );
  }

  @Version('2')
  @Get('innovation-development/:resultId')
  findQuestionInnovationDevelopmentV2(@Param('resultId') resultId: number) {
    return this.resultQuestionsService.findQuestionInnovationDevelopmentV2(
      resultId,
    );
  }
}
