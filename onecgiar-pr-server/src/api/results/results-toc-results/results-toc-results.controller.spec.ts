import { Test, TestingModule } from '@nestjs/testing';
import { ResultsTocResultsController } from './results-toc-results.controller';
import { ResultsTocResultsService } from './results-toc-results.service';

describe('ResultsTocResultsController', () => {
  let controller: ResultsTocResultsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultsTocResultsController],
      providers: [ResultsTocResultsService],
    }).compile();

    controller = module.get<ResultsTocResultsController>(
      ResultsTocResultsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
