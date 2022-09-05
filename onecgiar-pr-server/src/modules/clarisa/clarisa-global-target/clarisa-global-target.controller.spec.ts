import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaGlobalTargetController } from './clarisa-global-target.controller';
import { ClarisaGlobalTargetService } from './clarisa-global-target.service';

describe('ClarisaGlobalTargetController', () => {
  let controller: ClarisaGlobalTargetController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaGlobalTargetController],
      providers: [ClarisaGlobalTargetService],
    }).compile();

    controller = module.get<ClarisaGlobalTargetController>(ClarisaGlobalTargetController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
