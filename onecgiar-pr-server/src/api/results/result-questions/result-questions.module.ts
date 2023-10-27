import { Module } from '@nestjs/common';
import { ResultQuestionsService } from './result-questions.service';
import { ResultQuestionsController } from './result-questions.controller';
import { ResultQuestionsRepository } from './repository/result-questions.repository';
import { ResultAnswerRepository } from './repository/result-answers.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Module({
  controllers: [ResultQuestionsController],
  providers: [
    HandlersError,
    ResultQuestionsService,
    ResultQuestionsRepository,
    ResultAnswerRepository,
  ],
  exports: [ResultAnswerRepository],
})
export class ResultQuestionsModule {}
