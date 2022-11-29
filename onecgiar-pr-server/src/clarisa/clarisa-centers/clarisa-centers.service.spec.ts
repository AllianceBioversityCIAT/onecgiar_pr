import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaCentersService } from './clarisa-centers.service';

describe('ClarisaCentersService', () => {
  let service: ClarisaCentersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClarisaCentersService],
    }).compile();

    service = module.get<ClarisaCentersService>(ClarisaCentersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
