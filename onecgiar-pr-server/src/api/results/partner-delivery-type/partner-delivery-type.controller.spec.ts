import { Test, TestingModule } from '@nestjs/testing';
import { PartnerDeliveryTypeController } from './partner-delivery-type.controller';
import { PartnerDeliveryTypeService } from './partner-delivery-type.service';

describe('PartnerDeliveryTypeController', () => {
  let controller: PartnerDeliveryTypeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PartnerDeliveryTypeController],
      providers: [PartnerDeliveryTypeService],
    }).compile();

    controller = module.get<PartnerDeliveryTypeController>(
      PartnerDeliveryTypeController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
