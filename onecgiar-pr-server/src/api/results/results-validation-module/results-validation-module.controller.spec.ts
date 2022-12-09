import { Test, TestingModule } from '@nestjs/testing';
import { ResultsValidationModuleController } from './results-validation-module.controller';
import { ResultsValidationModuleService } from './results-validation-module.service';

describe('ResultsValidationModuleController', () => {
  let controller: ResultsValidationModuleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultsValidationModuleController],
      providers: [ResultsValidationModuleService],
    }).compile();

    controller = module.get<ResultsValidationModuleController>(ResultsValidationModuleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
