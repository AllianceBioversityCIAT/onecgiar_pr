import { Test, TestingModule } from '@nestjs/testing';
import { ResultsImpactAreaIndicatorsController } from './results-impact-area-indicators.controller';
import { ResultsImpactAreaIndicatorsService } from './results-impact-area-indicators.service';

describe('ResultsImpactAreaIndicatorsController', () => {
  let controller: ResultsImpactAreaIndicatorsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultsImpactAreaIndicatorsController],
      providers: [ResultsImpactAreaIndicatorsService],
    }).compile();

    controller = module.get<ResultsImpactAreaIndicatorsController>(
      ResultsImpactAreaIndicatorsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
