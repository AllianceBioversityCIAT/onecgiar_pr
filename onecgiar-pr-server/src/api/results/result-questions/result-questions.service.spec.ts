import { Test, TestingModule } from '@nestjs/testing';
import { ResultQuestionsService } from './result-questions.service';

describe('ResultQuestionsService', () => {
  let service: ResultQuestionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultQuestionsService],
    }).compile();

    service = module.get<ResultQuestionsService>(ResultQuestionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
