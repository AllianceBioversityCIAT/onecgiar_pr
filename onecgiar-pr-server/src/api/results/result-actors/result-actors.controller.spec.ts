import { Test, TestingModule } from '@nestjs/testing';
import { ResultActorsController } from './result-actors.controller';
import { ResultActorsService } from './result-actors.service';

describe('ResultActorsController', () => {
  let controller: ResultActorsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultActorsController],
      providers: [ResultActorsService],
    }).compile();

    controller = module.get<ResultActorsController>(ResultActorsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
