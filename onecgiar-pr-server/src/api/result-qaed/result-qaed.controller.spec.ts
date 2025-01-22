import { Test, TestingModule } from '@nestjs/testing';
import { ResultQaedController } from './result-qaed.controller';
import { ResultQaedService } from './result-qaed.service';

describe('ResultQaedController', () => {
  let controller: ResultQaedController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultQaedController],
      providers: [ResultQaedService],
    }).compile();

    controller = module.get<ResultQaedController>(ResultQaedController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
