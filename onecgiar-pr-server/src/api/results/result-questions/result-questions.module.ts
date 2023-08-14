import { Module } from '@nestjs/common';
import { ResultQuestionsService } from './result-questions.service';
import { ResultQuestionsController } from './result-questions.controller';

@Module({
  controllers: [ResultQuestionsController],
  providers: [ResultQuestionsService]
})
export class ResultQuestionsModule {}
