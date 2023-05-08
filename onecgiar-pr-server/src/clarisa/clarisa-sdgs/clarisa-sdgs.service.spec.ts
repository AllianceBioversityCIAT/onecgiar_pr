import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaSdgsService } from './clarisa-sdgs.service';

describe('ClarisaSdgsService', () => {
  let service: ClarisaSdgsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClarisaSdgsService],
    }).compile();

    service = module.get<ClarisaSdgsService>(ClarisaSdgsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
