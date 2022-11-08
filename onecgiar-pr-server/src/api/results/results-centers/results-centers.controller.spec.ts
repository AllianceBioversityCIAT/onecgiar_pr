import { Test, TestingModule } from '@nestjs/testing';
import { ResultsCentersController } from './results-centers.controller';
import { ResultsCentersService } from './results-centers.service';

describe('ResultsCentersController', () => {
  let controller: ResultsCentersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultsCentersController],
      providers: [ResultsCentersService],
    }).compile();

    controller = module.get<ResultsCentersController>(ResultsCentersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
