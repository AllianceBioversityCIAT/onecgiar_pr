import { Test, TestingModule } from '@nestjs/testing';
import { InititiativesController } from './inititiatives.controller';
import { InititiativesService } from './inititiatives.service';

describe('InititiativesController', () => {
  let controller: InititiativesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InititiativesController],
      providers: [InititiativesService],
    }).compile();

    controller = module.get<InititiativesController>(InititiativesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
