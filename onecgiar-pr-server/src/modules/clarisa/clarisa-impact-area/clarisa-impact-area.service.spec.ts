import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaImpactAreaService } from './clarisa-impact-area.service';

describe('ClarisaImpactAreaService', () => {
  let service: ClarisaImpactAreaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClarisaImpactAreaService],
    }).compile();

    service = module.get<ClarisaImpactAreaService>(ClarisaImpactAreaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
