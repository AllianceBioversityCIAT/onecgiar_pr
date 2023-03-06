import { Test, TestingModule } from '@nestjs/testing';
import { ResultInnovationPackageRegionsController } from './result-innovation-package-regions.controller';
import { ResultInnovationPackageRegionsService } from './result-innovation-package-regions.service';

describe('ResultInnovationPackageRegionsController', () => {
  let controller: ResultInnovationPackageRegionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultInnovationPackageRegionsController],
      providers: [ResultInnovationPackageRegionsService],
    }).compile();

    controller = module.get<ResultInnovationPackageRegionsController>(ResultInnovationPackageRegionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
