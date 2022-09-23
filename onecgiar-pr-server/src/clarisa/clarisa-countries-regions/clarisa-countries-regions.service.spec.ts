import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaCountriesRegionsService } from './clarisa-countries-regions.service';

describe('ClarisaCountriesRegionsService', () => {
  let service: ClarisaCountriesRegionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClarisaCountriesRegionsService],
    }).compile();

    service = module.get<ClarisaCountriesRegionsService>(ClarisaCountriesRegionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
