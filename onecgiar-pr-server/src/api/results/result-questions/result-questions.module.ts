import { Module } from '@nestjs/common';
import { ResultQuestionsService } from './result-questions.service';
import { ResultQuestionsController } from './result-questions.controller';
import { ResultQuestionTypesRepository } from './repository/result-question-types.repository';
import { ResultQuestionsRepository } from './repository/result-questions.repository';
import { ResultAnswerRepository } from './repository/result-answers.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Module({
  controllers: [ResultQuestionsController],
  providers: [
    HandlersError,
    ResultQuestionsService,
    ResultQuestionsRepository
  ],
})
export class ResultQuestionsModule {}
