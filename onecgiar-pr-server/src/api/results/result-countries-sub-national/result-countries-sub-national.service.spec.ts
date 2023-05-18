import { Test, TestingModule } from '@nestjs/testing';
import { ResultCountriesSubNationalService } from './result-countries-sub-national.service';

describe('ResultCountriesSubNationalService', () => {
  let service: ResultCountriesSubNationalService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultCountriesSubNationalService],
    }).compile();

    service = module.get<ResultCountriesSubNationalService>(ResultCountriesSubNationalService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
