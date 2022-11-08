import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaActionAreaOutcomeController } from './clarisa-action-area-outcome.controller';
import { ClarisaActionAreaOutcomeService } from './clarisa-action-area-outcome.service';

describe('ClarisaActionAreaOutcomeController', () => {
  let controller: ClarisaActionAreaOutcomeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaActionAreaOutcomeController],
      providers: [ClarisaActionAreaOutcomeService],
    }).compile();

    controller = module.get<ClarisaActionAreaOutcomeController>(ClarisaActionAreaOutcomeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
