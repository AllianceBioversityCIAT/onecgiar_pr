import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaInnovationTypeController } from './clarisa-innovation-type.controller';
import { ClarisaInnovationTypeService } from './clarisa-innovation-type.service';

describe('ClarisaInnovationTypeController', () => {
  let controller: ClarisaInnovationTypeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaInnovationTypeController],
      providers: [ClarisaInnovationTypeService],
    }).compile();

    controller = module.get<ClarisaInnovationTypeController>(ClarisaInnovationTypeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
