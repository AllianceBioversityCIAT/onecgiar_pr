import { Test, TestingModule } from '@nestjs/testing';
import { ResultInnovationPackageCountriesService } from './result-innovation-package-countries.service';

describe('ResultInnovationPackageCountriesService', () => {
  let service: ResultInnovationPackageCountriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultInnovationPackageCountriesService],
    }).compile();

    service = module.get<ResultInnovationPackageCountriesService>(ResultInnovationPackageCountriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
