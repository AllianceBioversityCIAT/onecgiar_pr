import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaRegionsCgiarService } from './clarisa-regions-cgiar.service';

describe('ClarisaRegionsCgiarService', () => {
  let service: ClarisaRegionsCgiarService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClarisaRegionsCgiarService],
    }).compile();

    service = module.get<ClarisaRegionsCgiarService>(ClarisaRegionsCgiarService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
