import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaGlobalTargetService } from './clarisa-global-target.service';

describe('ClarisaGlobalTargetService', () => {
  let service: ClarisaGlobalTargetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClarisaGlobalTargetService],
    }).compile();

    service = module.get<ClarisaGlobalTargetService>(
      ClarisaGlobalTargetService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
