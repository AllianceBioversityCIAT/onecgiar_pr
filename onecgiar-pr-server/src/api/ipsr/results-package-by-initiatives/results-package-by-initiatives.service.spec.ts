import { Test, TestingModule } from '@nestjs/testing';
import { ResultsPackageByInitiativesService } from './results-package-by-initiatives.service';

describe('ResultsPackageByInitiativesService', () => {
  let service: ResultsPackageByInitiativesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultsPackageByInitiativesService],
    }).compile();

    service = module.get<ResultsPackageByInitiativesService>(
      ResultsPackageByInitiativesService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
