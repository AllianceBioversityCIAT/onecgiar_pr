import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaRegionTypesService } from './clarisa-region-types.service';

describe('ClarisaRegionTypesService', () => {
  let service: ClarisaRegionTypesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClarisaRegionTypesService],
    }).compile();

    service = module.get<ClarisaRegionTypesService>(ClarisaRegionTypesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
