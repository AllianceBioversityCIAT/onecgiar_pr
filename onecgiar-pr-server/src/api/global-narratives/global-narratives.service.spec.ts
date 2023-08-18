import { Test, TestingModule } from '@nestjs/testing';
import { GlobalNarrativesService } from './global-narratives.service';

describe('GlobalNarrativesService', () => {
  let service: GlobalNarrativesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GlobalNarrativesService],
    }).compile();

    service = module.get<GlobalNarrativesService>(GlobalNarrativesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
