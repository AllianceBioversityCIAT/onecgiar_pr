import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaInnovationReadinessLevelsController } from './clarisa-innovation-readiness-levels.controller';
import { ClarisaInnovationReadinessLevelsService } from './clarisa-innovation-readiness-levels.service';

describe('ClarisaInnovationReadinessLevelsController', () => {
  let controller: ClarisaInnovationReadinessLevelsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaInnovationReadinessLevelsController],
      providers: [ClarisaInnovationReadinessLevelsService],
    }).compile();

    controller = module.get<ClarisaInnovationReadinessLevelsController>(ClarisaInnovationReadinessLevelsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
