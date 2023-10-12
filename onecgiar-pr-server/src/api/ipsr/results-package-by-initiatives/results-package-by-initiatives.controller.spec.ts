import { Test, TestingModule } from '@nestjs/testing';
import { ResultsPackageByInitiativesController } from './results-package-by-initiatives.controller';
import { ResultsPackageByInitiativesService } from './results-package-by-initiatives.service';

describe('ResultsPackageByInitiativesController', () => {
  let controller: ResultsPackageByInitiativesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultsPackageByInitiativesController],
      providers: [ResultsPackageByInitiativesService],
    }).compile();

    controller = module.get<ResultsPackageByInitiativesController>(
      ResultsPackageByInitiativesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
