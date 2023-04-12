import { Test, TestingModule } from '@nestjs/testing';
import { ResultsComplementaryInnovationsController } from './results-complementary-innovations.controller';
import { ResultsComplementaryInnovationsService } from './results-complementary-innovations.service';

describe('ResultsComplementaryInnovationsController', () => {
  let controller: ResultsComplementaryInnovationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultsComplementaryInnovationsController],
      providers: [ResultsComplementaryInnovationsService],
    }).compile();

    controller = module.get<ResultsComplementaryInnovationsController>(ResultsComplementaryInnovationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
