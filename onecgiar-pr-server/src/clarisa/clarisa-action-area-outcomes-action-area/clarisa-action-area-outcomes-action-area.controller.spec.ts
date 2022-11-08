import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaActionAreaOutcomesActionAreaController } from './clarisa-action-area-outcomes-action-area.controller';
import { ClarisaActionAreaOutcomesActionAreaService } from './clarisa-action-area-outcomes-action-area.service';

describe('ClarisaActionAreaOutcomesActionAreaController', () => {
  let controller: ClarisaActionAreaOutcomesActionAreaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaActionAreaOutcomesActionAreaController],
      providers: [ClarisaActionAreaOutcomesActionAreaService],
    }).compile();

    controller = module.get<ClarisaActionAreaOutcomesActionAreaController>(ClarisaActionAreaOutcomesActionAreaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
