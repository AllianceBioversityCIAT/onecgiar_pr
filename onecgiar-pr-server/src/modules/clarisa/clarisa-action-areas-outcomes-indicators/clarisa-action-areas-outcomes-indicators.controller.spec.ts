import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaActionAreasOutcomesIndicatorsController } from './clarisa-action-areas-outcomes-indicators.controller';
import { ClarisaActionAreasOutcomesIndicatorsService } from './clarisa-action-areas-outcomes-indicators.service';

describe('ClarisaActionAreasOutcomesIndicatorsController', () => {
  let controller: ClarisaActionAreasOutcomesIndicatorsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaActionAreasOutcomesIndicatorsController],
      providers: [ClarisaActionAreasOutcomesIndicatorsService],
    }).compile();

    controller = module.get<ClarisaActionAreasOutcomesIndicatorsController>(ClarisaActionAreasOutcomesIndicatorsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
