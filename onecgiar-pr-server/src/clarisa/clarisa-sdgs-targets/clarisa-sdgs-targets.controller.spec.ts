import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaSdgsTargetsController } from './clarisa-sdgs-targets.controller';
import { ClarisaSdgsTargetsService } from './clarisa-sdgs-targets.service';

describe('ClarisaSdgsTargetsController', () => {
  let controller: ClarisaSdgsTargetsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaSdgsTargetsController],
      providers: [ClarisaSdgsTargetsService],
    }).compile();

    controller = module.get<ClarisaSdgsTargetsController>(
      ClarisaSdgsTargetsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
