import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaInnovationCharacteristicsService } from './clarisa-innovation-characteristics.service';

describe('ClarisaInnovationCharacteristicsService', () => {
  let service: ClarisaInnovationCharacteristicsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClarisaInnovationCharacteristicsService],
    }).compile();

    service = module.get<ClarisaInnovationCharacteristicsService>(ClarisaInnovationCharacteristicsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
