import { Test, TestingModule } from '@nestjs/testing';
import { ResultsImpactAreaTargetController } from './results-impact-area-target.controller';
import { ResultsImpactAreaTargetService } from './results-impact-area-target.service';

describe('ResultsImpactAreaTargetController', () => {
  let controller: ResultsImpactAreaTargetController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultsImpactAreaTargetController],
      providers: [ResultsImpactAreaTargetService],
    }).compile();

    controller = module.get<ResultsImpactAreaTargetController>(ResultsImpactAreaTargetController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
