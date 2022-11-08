import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaCountriesRegionsController } from './clarisa-countries-regions.controller';
import { ClarisaCountriesRegionsService } from './clarisa-countries-regions.service';

describe('ClarisaCountriesRegionsController', () => {
  let controller: ClarisaCountriesRegionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaCountriesRegionsController],
      providers: [ClarisaCountriesRegionsService],
    }).compile();

    controller = module.get<ClarisaCountriesRegionsController>(
      ClarisaCountriesRegionsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
