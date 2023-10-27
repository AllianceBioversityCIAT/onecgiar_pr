import { Controller, Get, Param, HttpException } from '@nestjs/common';
import { ResultQuestionsService } from './result-questions.service';

@Controller()
export class ResultQuestionsController {
  constructor(
    private readonly resultQuestionsService: ResultQuestionsService,
  ) {}

  @Get('policy-change/:resultId')
  async findQuestionPolicyChange(@Param('resultId') resultId: number) {
    const { response, message, status } =
      await this.resultQuestionsService.findQuestionPolicyChange(resultId);

    throw new HttpException({ response, message }, status);
  }

  @Get('innovation-development/:resultId')
  async findQuestionInnovationDevelopment(@Param('resultId') resultId: number) {
    const { response, message, status } =
      await this.resultQuestionsService.findQuestionInnovationDevelopment(
        resultId,
      );

    throw new HttpException({ response, message }, status);
  }
}
