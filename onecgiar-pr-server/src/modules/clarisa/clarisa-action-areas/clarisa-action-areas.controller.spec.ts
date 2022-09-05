import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaActionAreasController } from './clarisa-action-areas.controller';
import { ClarisaActionAreasService } from './clarisa-action-areas.service';

describe('ClarisaActionAreasController', () => {
  let controller: ClarisaActionAreasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaActionAreasController],
      providers: [ClarisaActionAreasService],
    }).compile();

    controller = module.get<ClarisaActionAreasController>(ClarisaActionAreasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
