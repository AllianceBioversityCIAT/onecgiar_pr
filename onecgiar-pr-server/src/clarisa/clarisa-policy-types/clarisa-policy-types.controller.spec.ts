import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaPolicyTypesController } from './clarisa-policy-types.controller';
import { ClarisaPolicyTypesService } from './clarisa-policy-types.service';

describe('ClarisaPolicyTypesController', () => {
  let controller: ClarisaPolicyTypesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaPolicyTypesController],
      providers: [ClarisaPolicyTypesService],
    }).compile();

    controller = module.get<ClarisaPolicyTypesController>(ClarisaPolicyTypesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
