import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaImpactAreaController } from './clarisa-impact-area.controller';
import { ClarisaImpactAreaService } from './clarisa-impact-area.service';

describe('ClarisaImpactAreaController', () => {
  let controller: ClarisaImpactAreaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaImpactAreaController],
      providers: [ClarisaImpactAreaService],
    }).compile();

    controller = module.get<ClarisaImpactAreaController>(
      ClarisaImpactAreaController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
