import { Test, TestingModule } from '@nestjs/testing';
import { ResultsPackageCentersService } from './results-package-centers.service';

describe('ResultsPackageCentersService', () => {
  let service: ResultsPackageCentersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultsPackageCentersService],
    }).compile();

    service = module.get<ResultsPackageCentersService>(
      ResultsPackageCentersService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
