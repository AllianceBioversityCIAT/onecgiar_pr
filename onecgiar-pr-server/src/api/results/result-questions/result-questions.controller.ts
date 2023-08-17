import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpException,
} from '@nestjs/common';
import { ResultQuestionsService } from './result-questions.service';
import { CreateResultQuestionDto } from './dto/create-result-question.dto';
import { UpdateResultQuestionDto } from './dto/update-result-question.dto';

@Controller()
export class ResultQuestionsController {
  constructor(
    private readonly resultQuestionsService: ResultQuestionsService,
  ) {}

  @Get('innovation-development/:resultId')
  async findQuestionInnovationDevelopment(@Param('resultId') resultId: number) {
    const { response, message, status } =
      await this.resultQuestionsService.findQuestionInnovationDevelopment(resultId);

    throw new HttpException({ response, message }, status);
  }
}
