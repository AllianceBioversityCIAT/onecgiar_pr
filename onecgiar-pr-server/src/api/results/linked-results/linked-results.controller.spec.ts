import { Test, TestingModule } from '@nestjs/testing';
import { LinkedResultsController } from './linked-results.controller';
import { LinkedResultsService } from './linked-results.service';

describe('LinkedResultsController', () => {
  let controller: LinkedResultsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LinkedResultsController],
      providers: [LinkedResultsService],
    }).compile();

    controller = module.get<LinkedResultsController>(LinkedResultsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
