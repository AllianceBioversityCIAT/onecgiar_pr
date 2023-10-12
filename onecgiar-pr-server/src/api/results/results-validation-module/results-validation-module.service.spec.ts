import { Test, TestingModule } from '@nestjs/testing';
import { ResultsValidationModuleService } from './results-validation-module.service';

describe('ResultsValidationModuleService', () => {
  let service: ResultsValidationModuleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultsValidationModuleService],
    }).compile();

    service = module.get<ResultsValidationModuleService>(
      ResultsValidationModuleService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
