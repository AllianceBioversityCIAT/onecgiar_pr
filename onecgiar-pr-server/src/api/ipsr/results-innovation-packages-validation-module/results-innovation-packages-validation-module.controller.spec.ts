import { Test, TestingModule } from '@nestjs/testing';
import { ResultsInnovationPackagesValidationModuleController } from './results-innovation-packages-validation-module.controller';
import { ResultsInnovationPackagesValidationModuleService } from './results-innovation-packages-validation-module.service';

describe('ResultsInnovationPackagesValidationModuleController', () => {
  let controller: ResultsInnovationPackagesValidationModuleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultsInnovationPackagesValidationModuleController],
      providers: [ResultsInnovationPackagesValidationModuleService],
    }).compile();

    controller = module.get<ResultsInnovationPackagesValidationModuleController>(ResultsInnovationPackagesValidationModuleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
