import { Test, TestingModule } from '@nestjs/testing';
import { ResultsByInititiativesController } from './results_by_inititiatives.controller';
import { ResultsByInititiativesService } from './results_by_inititiatives.service';

describe('ResultsByInititiativesController', () => {
  let controller: ResultsByInititiativesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultsByInititiativesController],
      providers: [ResultsByInititiativesService],
    }).compile();

    controller = module.get<ResultsByInititiativesController>(
      ResultsByInititiativesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
