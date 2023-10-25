import { Test, TestingModule } from '@nestjs/testing';
import { InnovationPackagingExpertsController } from './innovation-packaging-experts.controller';
import { InnovationPackagingExpertsService } from './innovation-packaging-experts.service';

describe('InnovationPackagingExpertsController', () => {
  let controller: InnovationPackagingExpertsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InnovationPackagingExpertsController],
      providers: [InnovationPackagingExpertsService],
    }).compile();

    controller = module.get<InnovationPackagingExpertsController>(
      InnovationPackagingExpertsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
