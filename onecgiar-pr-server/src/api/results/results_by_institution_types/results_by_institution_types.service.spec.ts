import { Test, TestingModule } from '@nestjs/testing';
import { ResultsByInstitutionTypesService } from './results_by_institution_types.service';

describe('ResultsByInstitutionTypesService', () => {
  let service: ResultsByInstitutionTypesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultsByInstitutionTypesService],
    }).compile();

    service = module.get<ResultsByInstitutionTypesService>(ResultsByInstitutionTypesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
