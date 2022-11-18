import { Test, TestingModule } from '@nestjs/testing';
import { CapdevsDeliveryMethodsService } from './capdevs-delivery-methods.service';

describe('CapdevsDeliveryMethodsService', () => {
  let service: CapdevsDeliveryMethodsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CapdevsDeliveryMethodsService],
    }).compile();

    service = module.get<CapdevsDeliveryMethodsService>(CapdevsDeliveryMethodsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
