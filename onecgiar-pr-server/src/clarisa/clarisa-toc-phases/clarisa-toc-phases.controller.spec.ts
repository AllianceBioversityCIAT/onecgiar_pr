import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaTocPhasesController } from './clarisa-toc-phases.controller';
import { ClarisaTocPhasesService } from './clarisa-toc-phases.service';

describe('ClarisaTocPhasesController', () => {
  let controller: ClarisaTocPhasesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaTocPhasesController],
      providers: [ClarisaTocPhasesService],
    }).compile();

    controller = module.get<ClarisaTocPhasesController>(
      ClarisaTocPhasesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
