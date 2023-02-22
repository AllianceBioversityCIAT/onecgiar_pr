import { Test, TestingModule } from '@nestjs/testing';
import { PrimaryImpactAreaService } from './primary-impact-area.service';

describe('PrimaryImpactAreaService', () => {
  let service: PrimaryImpactAreaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrimaryImpactAreaService],
    }).compile();

    service = module.get<PrimaryImpactAreaService>(PrimaryImpactAreaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
