import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaGlobalUnitController } from './clarisa-global-unit.controller';
import { ClarisaGlobalUnitService } from './clarisa-global-unit.service';

describe('ClarisaGlobalUnitController', () => {
  let controller: ClarisaGlobalUnitController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaGlobalUnitController],
      providers: [ClarisaGlobalUnitService],
    }).compile();

    controller = module.get<ClarisaGlobalUnitController>(ClarisaGlobalUnitController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
