import { Test, TestingModule } from '@nestjs/testing';
import { ResultsByInstitutionsService } from './results_by_institutions.service';

describe('ResultsByInstitutionsService', () => {
  let service: ResultsByInstitutionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultsByInstitutionsService],
    }).compile();

    service = module.get<ResultsByInstitutionsService>(ResultsByInstitutionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
