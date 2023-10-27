import { Test, TestingModule } from '@nestjs/testing';
import { ResultQuestionsController } from './result-questions.controller';
import { ResultQuestionsService } from './result-questions.service';

describe('ResultQuestionsController', () => {
  let controller: ResultQuestionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultQuestionsController],
      providers: [ResultQuestionsService],
    }).compile();

    controller = module.get<ResultQuestionsController>(
      ResultQuestionsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
