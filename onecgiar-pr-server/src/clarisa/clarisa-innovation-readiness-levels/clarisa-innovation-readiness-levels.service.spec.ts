import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaInnovationReadinessLevelsService } from './clarisa-innovation-readiness-levels.service';

describe('ClarisaInnovationReadinessLevelsService', () => {
  let service: ClarisaInnovationReadinessLevelsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClarisaInnovationReadinessLevelsService],
    }).compile();

    service = module.get<ClarisaInnovationReadinessLevelsService>(ClarisaInnovationReadinessLevelsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
