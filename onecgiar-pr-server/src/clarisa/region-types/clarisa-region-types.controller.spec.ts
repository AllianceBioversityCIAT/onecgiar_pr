import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaRegionTypesController } from './clarisa-region-types.controller';
import { ClarisaRegionTypesService } from './clarisa-region-types.service';

describe('RegionTypesController', () => {
  let controller: ClarisaRegionTypesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaRegionTypesController],
      providers: [ClarisaRegionTypesService],
    }).compile();

    controller = module.get<ClarisaRegionTypesController>(ClarisaRegionTypesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
