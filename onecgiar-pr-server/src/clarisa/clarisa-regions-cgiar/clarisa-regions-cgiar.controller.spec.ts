import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaRegionsCgiarController } from './clarisa-regions-cgiar.controller';
import { ClarisaRegionsCgiarService } from './clarisa-regions-cgiar.service';

describe('ClarisaRegionsCgiarController', () => {
  let controller: ClarisaRegionsCgiarController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaRegionsCgiarController],
      providers: [ClarisaRegionsCgiarService],
    }).compile();

    controller = module.get<ClarisaRegionsCgiarController>(ClarisaRegionsCgiarController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
