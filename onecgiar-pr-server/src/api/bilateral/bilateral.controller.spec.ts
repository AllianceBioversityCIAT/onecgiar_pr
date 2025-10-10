import { Test, TestingModule } from '@nestjs/testing';
import { BilateralController } from './bilateral.controller';
import { BilateralService } from './bilateral.service';

describe('BilateralController', () => {
  let controller: BilateralController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BilateralController],
      providers: [BilateralService],
    }).compile();

    controller = module.get<BilateralController>(BilateralController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
