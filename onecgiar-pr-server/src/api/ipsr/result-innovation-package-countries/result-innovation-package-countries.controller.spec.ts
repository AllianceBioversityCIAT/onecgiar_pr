import { Test, TestingModule } from '@nestjs/testing';
import { ResultInnovationPackageCountriesController } from './result-innovation-package-countries.controller';
import { ResultInnovationPackageCountriesService } from './result-innovation-package-countries.service';

describe('ResultInnovationPackageCountriesController', () => {
  let controller: ResultInnovationPackageCountriesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultInnovationPackageCountriesController],
      providers: [ResultInnovationPackageCountriesService],
    }).compile();

    controller = module.get<ResultInnovationPackageCountriesController>(
      ResultInnovationPackageCountriesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
