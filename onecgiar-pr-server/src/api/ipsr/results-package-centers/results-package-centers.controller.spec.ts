import { Test, TestingModule } from '@nestjs/testing';
import { ResultsPackageCentersController } from './results-package-centers.controller';
import { ResultsPackageCentersService } from './results-package-centers.service';

describe('ResultsPackageCentersController', () => {
  let controller: ResultsPackageCentersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultsPackageCentersController],
      providers: [ResultsPackageCentersService],
    }).compile();

    controller = module.get<ResultsPackageCentersController>(
      ResultsPackageCentersController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
