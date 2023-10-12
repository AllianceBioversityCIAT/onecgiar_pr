import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaActionAreaOutcomesActionAreaService } from './clarisa-action-area-outcomes-action-area.service';

describe('ClarisaActionAreaOutcomesActionAreaService', () => {
  let service: ClarisaActionAreaOutcomesActionAreaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClarisaActionAreaOutcomesActionAreaService],
    }).compile();

    service = module.get<ClarisaActionAreaOutcomesActionAreaService>(
      ClarisaActionAreaOutcomesActionAreaService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
