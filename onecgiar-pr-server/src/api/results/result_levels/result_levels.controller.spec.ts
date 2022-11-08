import { Test, TestingModule } from '@nestjs/testing';
import { ResultLevelsController } from './result_levels.controller';
import { ResultLevelsService } from './result_levels.service';

describe('ResultLevelsController', () => {
  let controller: ResultLevelsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultLevelsController],
      providers: [ResultLevelsService],
    }).compile();

    controller = module.get<ResultLevelsController>(ResultLevelsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
