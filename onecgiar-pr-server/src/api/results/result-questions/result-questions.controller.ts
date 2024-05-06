import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
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
}
