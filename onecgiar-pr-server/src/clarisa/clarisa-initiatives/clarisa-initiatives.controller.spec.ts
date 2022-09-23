import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaInitiativesController } from './clarisa-initiatives.controller';
import { ClarisaInitiativesService } from './clarisa-initiatives.service';

describe('ClarisaInitiativesController', () => {
  let controller: ClarisaInitiativesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaInitiativesController],
      providers: [ClarisaInitiativesService],
    }).compile();

    controller = module.get<ClarisaInitiativesController>(ClarisaInitiativesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
