import { Test, TestingModule } from '@nestjs/testing';
import { ResultByLevelController } from './result-by-level.controller';
import { ResultByLevelService } from './result-by-level.service';

describe('ResultByLevelController', () => {
  let controller: ResultByLevelController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultByLevelController],
      providers: [ResultByLevelService],
    }).compile();

    controller = module.get<ResultByLevelController>(ResultByLevelController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
