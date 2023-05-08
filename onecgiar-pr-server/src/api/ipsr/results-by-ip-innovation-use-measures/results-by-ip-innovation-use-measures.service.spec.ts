import { Test, TestingModule } from '@nestjs/testing';
import { ResultsByIpInnovationUseMeasuresService } from './results-by-ip-innovation-use-measures.service';

describe('ResultsByIpInnovationUseMeasuresService', () => {
  let service: ResultsByIpInnovationUseMeasuresService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultsByIpInnovationUseMeasuresService],
    }).compile();

    service = module.get<ResultsByIpInnovationUseMeasuresService>(ResultsByIpInnovationUseMeasuresService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
