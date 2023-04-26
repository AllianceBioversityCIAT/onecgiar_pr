import { Test, TestingModule } from '@nestjs/testing';
import { ResultCountriesSubNationalController } from './result-countries-sub-national.controller';
import { ResultCountriesSubNationalService } from './result-countries-sub-national.service';

describe('ResultCountriesSubNationalController', () => {
  let controller: ResultCountriesSubNationalController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultCountriesSubNationalController],
      providers: [ResultCountriesSubNationalService],
    }).compile();

    controller = module.get<ResultCountriesSubNationalController>(ResultCountriesSubNationalController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
