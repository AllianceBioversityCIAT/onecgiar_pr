import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaCentersController } from './clarisa-centers.controller';
import { ClarisaCentersService } from './clarisa-centers.service';

describe('ClarisaCentersController', () => {
  let controller: ClarisaCentersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaCentersController],
      providers: [ClarisaCentersService],
    }).compile();

    controller = module.get<ClarisaCentersController>(ClarisaCentersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
