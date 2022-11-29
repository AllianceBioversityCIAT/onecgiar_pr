import { Test, TestingModule } from '@nestjs/testing';
import { UnitsOfMeasureService } from './units-of-measure.service';

describe('UnitsOfMeasureService', () => {
  let service: UnitsOfMeasureService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UnitsOfMeasureService],
    }).compile();

    service = module.get<UnitsOfMeasureService>(UnitsOfMeasureService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
