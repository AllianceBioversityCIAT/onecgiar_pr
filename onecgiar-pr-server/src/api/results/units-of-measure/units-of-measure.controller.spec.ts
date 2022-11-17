import { Test, TestingModule } from '@nestjs/testing';
import { UnitsOfMeasureController } from './units-of-measure.controller';
import { UnitsOfMeasureService } from './units-of-measure.service';

describe('UnitsOfMeasureController', () => {
  let controller: UnitsOfMeasureController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UnitsOfMeasureController],
      providers: [UnitsOfMeasureService],
    }).compile();

    controller = module.get<UnitsOfMeasureController>(UnitsOfMeasureController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
