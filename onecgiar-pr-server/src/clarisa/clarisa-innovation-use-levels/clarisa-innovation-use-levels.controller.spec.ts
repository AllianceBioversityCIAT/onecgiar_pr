import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaInnovationUseLevelsController } from './clarisa-innovation-use-levels.controller';
import { ClarisaInnovationUseLevelsService } from './clarisa-innovation-use-levels.service';

describe('ClarisaInnovationUseLevelsController', () => {
  let controller: ClarisaInnovationUseLevelsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaInnovationUseLevelsController],
      providers: [ClarisaInnovationUseLevelsService],
    }).compile();

    controller = module.get<ClarisaInnovationUseLevelsController>(
      ClarisaInnovationUseLevelsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
