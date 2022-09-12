import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaImpactAreaIndicatorsController } from './clarisa-impact-area-indicators.controller';
import { ClarisaImpactAreaIndicatorsService } from './clarisa-impact-area-indicators.service';

describe('ClarisaImpactAreaIndicatorsController', () => {
  let controller: ClarisaImpactAreaIndicatorsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaImpactAreaIndicatorsController],
      providers: [ClarisaImpactAreaIndicatorsService],
    }).compile();

    controller = module.get<ClarisaImpactAreaIndicatorsController>(
      ClarisaImpactAreaIndicatorsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
