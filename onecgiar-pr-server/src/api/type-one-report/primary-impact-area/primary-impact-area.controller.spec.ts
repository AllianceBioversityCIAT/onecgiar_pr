import { Test, TestingModule } from '@nestjs/testing';
import { PrimaryImpactAreaController } from './primary-impact-area.controller';
import { PrimaryImpactAreaService } from './primary-impact-area.service';

describe('PrimaryImpactAreaController', () => {
  let controller: PrimaryImpactAreaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrimaryImpactAreaController],
      providers: [PrimaryImpactAreaService],
    }).compile();

    controller = module.get<PrimaryImpactAreaController>(PrimaryImpactAreaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
