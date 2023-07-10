import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaTocPhasesService } from './clarisa-toc-phases.service';

describe('ClarisaTocPhasesService', () => {
  let service: ClarisaTocPhasesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClarisaTocPhasesService],
    }).compile();

    service = module.get<ClarisaTocPhasesService>(ClarisaTocPhasesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
