import { Test, TestingModule } from '@nestjs/testing';
import { ResultsInnovationPackagesEnablerTypeController } from './results-innovation-packages-enabler-type.controller';
import { ResultsInnovationPackagesEnablerTypeService } from './results-innovation-packages-enabler-type.service';

describe('ResultsInnovationPackagesEnablerTypeController', () => {
  let controller: ResultsInnovationPackagesEnablerTypeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultsInnovationPackagesEnablerTypeController],
      providers: [ResultsInnovationPackagesEnablerTypeService],
    }).compile();

    controller = module.get<ResultsInnovationPackagesEnablerTypeController>(
      ResultsInnovationPackagesEnablerTypeController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
