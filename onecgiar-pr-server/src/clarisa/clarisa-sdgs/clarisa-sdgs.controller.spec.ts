import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaSdgsController } from './clarisa-sdgs.controller';
import { ClarisaSdgsService } from './clarisa-sdgs.service';

describe('ClarisaSdgsController', () => {
  let controller: ClarisaSdgsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaSdgsController],
      providers: [ClarisaSdgsService],
    }).compile();

    controller = module.get<ClarisaSdgsController>(ClarisaSdgsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
