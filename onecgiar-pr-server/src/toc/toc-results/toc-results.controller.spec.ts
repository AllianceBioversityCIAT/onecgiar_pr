import { Test, TestingModule } from '@nestjs/testing';
import { TocResultsController } from './toc-results.controller';
import { TocResultsService } from './toc-results.service';

describe('TocResultsController', () => {
  let controller: TocResultsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TocResultsController],
      providers: [TocResultsService],
    }).compile();

    controller = module.get<TocResultsController>(TocResultsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
