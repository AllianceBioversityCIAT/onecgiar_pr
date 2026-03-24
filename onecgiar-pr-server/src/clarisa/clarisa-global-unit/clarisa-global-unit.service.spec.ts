import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaGlobalUnitService } from './clarisa-global-unit.service';

describe('ClarisaGlobalUnitService', () => {
  let service: ClarisaGlobalUnitService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClarisaGlobalUnitService],
    }).compile();

    service = module.get<ClarisaGlobalUnitService>(ClarisaGlobalUnitService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
