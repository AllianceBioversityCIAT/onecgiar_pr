import { Test, TestingModule } from '@nestjs/testing';
import { ResultsByInititiativesService } from './results_by_inititiatives.service';

describe('ResultsByInititiativesService', () => {
  let service: ResultsByInititiativesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultsByInititiativesService],
    }).compile();

    service = module.get<ResultsByInititiativesService>(ResultsByInititiativesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
