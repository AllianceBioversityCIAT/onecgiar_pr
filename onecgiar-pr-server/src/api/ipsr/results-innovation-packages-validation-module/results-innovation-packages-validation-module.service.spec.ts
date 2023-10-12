import { Test, TestingModule } from '@nestjs/testing';
import { ResultsInnovationPackagesValidationModuleService } from './results-innovation-packages-validation-module.service';

describe('ResultsInnovationPackagesValidationModuleService', () => {
  let service: ResultsInnovationPackagesValidationModuleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultsInnovationPackagesValidationModuleService],
    }).compile();

    service = module.get<ResultsInnovationPackagesValidationModuleService>(
      ResultsInnovationPackagesValidationModuleService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
