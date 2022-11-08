import { Test, TestingModule } from '@nestjs/testing';
import { ResultsByEvidencesService } from './results_by_evidences.service';

describe('ResultsByEvidencesService', () => {
  let service: ResultsByEvidencesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultsByEvidencesService],
    }).compile();

    service = module.get<ResultsByEvidencesService>(ResultsByEvidencesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
