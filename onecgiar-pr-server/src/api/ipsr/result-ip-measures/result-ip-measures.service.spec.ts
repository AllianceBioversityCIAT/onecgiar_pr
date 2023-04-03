import { Test, TestingModule } from '@nestjs/testing';
import { ResultIpMeasuresService } from './result-ip-measures.service';

describe('ResultIpMeasuresService', () => {
  let service: ResultIpMeasuresService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultIpMeasuresService],
    }).compile();

    service = module.get<ResultIpMeasuresService>(ResultIpMeasuresService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
