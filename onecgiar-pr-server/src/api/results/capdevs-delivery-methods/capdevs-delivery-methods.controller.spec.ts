import { Test, TestingModule } from '@nestjs/testing';
import { CapdevsDeliveryMethodsController } from './capdevs-delivery-methods.controller';
import { CapdevsDeliveryMethodsService } from './capdevs-delivery-methods.service';

describe('CapdevsDeliveryMethodsController', () => {
  let controller: CapdevsDeliveryMethodsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CapdevsDeliveryMethodsController],
      providers: [CapdevsDeliveryMethodsService],
    }).compile();

    controller = module.get<CapdevsDeliveryMethodsController>(CapdevsDeliveryMethodsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
