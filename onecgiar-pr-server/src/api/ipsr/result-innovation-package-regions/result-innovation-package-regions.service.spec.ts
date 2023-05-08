import { Test, TestingModule } from '@nestjs/testing';
import { ResultInnovationPackageRegionsService } from './result-innovation-package-regions.service';

describe('ResultInnovationPackageRegionsService', () => {
  let service: ResultInnovationPackageRegionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultInnovationPackageRegionsService],
    }).compile();

    service = module.get<ResultInnovationPackageRegionsService>(ResultInnovationPackageRegionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
