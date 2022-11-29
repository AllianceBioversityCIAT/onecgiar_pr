import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaOutcomeIndicatorsController } from './clarisa-outcome-indicators.controller';
import { ClarisaOutcomeIndicatorsService } from './clarisa-outcome-indicators.service';

describe('ClarisaOutcomeIndicatorsController', () => {
  let controller: ClarisaOutcomeIndicatorsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaOutcomeIndicatorsController],
      providers: [ClarisaOutcomeIndicatorsService],
    }).compile();

    controller = module.get<ClarisaOutcomeIndicatorsController>(
      ClarisaOutcomeIndicatorsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
