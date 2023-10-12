import { Test, TestingModule } from '@nestjs/testing';
import { ResultInnovationPackageController } from './result-innovation-package.controller';
import { ResultInnovationPackageService } from './result-innovation-package.service';

describe('ResultInnovationPackageController', () => {
  let controller: ResultInnovationPackageController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultInnovationPackageController],
      providers: [ResultInnovationPackageService],
    }).compile();

    controller = module.get<ResultInnovationPackageController>(
      ResultInnovationPackageController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
