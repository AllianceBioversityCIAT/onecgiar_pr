import { Test, TestingModule } from '@nestjs/testing';
import { PartnerDeliveryTypeService } from './partner-delivery-type.service';

describe('PartnerDeliveryTypeService', () => {
  let service: PartnerDeliveryTypeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PartnerDeliveryTypeService],
    }).compile();

    service = module.get<PartnerDeliveryTypeService>(
      PartnerDeliveryTypeService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
