import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaActionAreasService } from './clarisa-action-areas.service';

describe('ClarisaActionAreasService', () => {
  let service: ClarisaActionAreasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClarisaActionAreasService],
    }).compile();

    service = module.get<ClarisaActionAreasService>(ClarisaActionAreasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
