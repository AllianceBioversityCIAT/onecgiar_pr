import { Test, TestingModule } from '@nestjs/testing';
import { ResultInnovationPackageService } from './result-innovation-package.service';

describe('ResultInnovationPackageService', () => {
  let service: ResultInnovationPackageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultInnovationPackageService],
    }).compile();

    service = module.get<ResultInnovationPackageService>(
      ResultInnovationPackageService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
