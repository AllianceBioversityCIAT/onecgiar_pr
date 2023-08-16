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

  @Get('innovation-development')
  async findQuestionInnovationDevelopment() {
    const { response, message, status } =
      await this.resultQuestionsService.findQuestionInnovationDevelopment();

    throw new HttpException({ response, message }, status);
  }
}
