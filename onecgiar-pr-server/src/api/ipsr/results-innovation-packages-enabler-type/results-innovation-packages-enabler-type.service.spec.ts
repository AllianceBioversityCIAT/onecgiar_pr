import { Test, TestingModule } from '@nestjs/testing';
import { ResultsInnovationPackagesEnablerTypeService } from './results-innovation-packages-enabler-type.service';

describe('ResultsInnovationPackagesEnablerTypeService', () => {
  let service: ResultsInnovationPackagesEnablerTypeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultsInnovationPackagesEnablerTypeService],
    }).compile();

    service = module.get<ResultsInnovationPackagesEnablerTypeService>(
      ResultsInnovationPackagesEnablerTypeService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
