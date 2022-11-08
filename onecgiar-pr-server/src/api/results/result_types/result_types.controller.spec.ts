import { Test, TestingModule } from '@nestjs/testing';
import { ResultTypesController } from './result_types.controller';
import { ResultTypesService } from './result_types.service';

describe('ResultTypesController', () => {
  let controller: ResultTypesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultTypesController],
      providers: [ResultTypesService],
    }).compile();

    controller = module.get<ResultTypesController>(ResultTypesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
