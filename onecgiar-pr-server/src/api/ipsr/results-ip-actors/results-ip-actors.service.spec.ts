import { Test, TestingModule } from '@nestjs/testing';
import { ResultsIpActorsService } from './results-ip-actors.service';

describe('ResultsIpActorsService', () => {
  let service: ResultsIpActorsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultsIpActorsService],
    }).compile();

    service = module.get<ResultsIpActorsService>(ResultsIpActorsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
