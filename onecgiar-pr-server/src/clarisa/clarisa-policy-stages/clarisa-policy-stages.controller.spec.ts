import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaPolicyStagesController } from './clarisa-policy-stages.controller';
import { ClarisaPolicyStagesService } from './clarisa-policy-stages.service';

describe('ClarisaPolicyStagesController', () => {
  let controller: ClarisaPolicyStagesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaPolicyStagesController],
      providers: [ClarisaPolicyStagesService],
    }).compile();

    controller = module.get<ClarisaPolicyStagesController>(
      ClarisaPolicyStagesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
