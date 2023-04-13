import { Test, TestingModule } from '@nestjs/testing';
import { ResultsComplementaryInnovationsFunctionsController } from './results-complementary-innovations-functions.controller';
import { ResultsComplementaryInnovationsFunctionsService } from './results-complementary-innovations-functions.service';

describe('ResultsComplementaryInnovationsFunctionsController', () => {
  let controller: ResultsComplementaryInnovationsFunctionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultsComplementaryInnovationsFunctionsController],
      providers: [ResultsComplementaryInnovationsFunctionsService],
    }).compile();

    controller = module.get<ResultsComplementaryInnovationsFunctionsController>(ResultsComplementaryInnovationsFunctionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
