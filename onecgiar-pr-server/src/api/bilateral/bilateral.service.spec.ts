import { Test, TestingModule } from '@nestjs/testing';
import { BilateralService } from './bilateral.service';

describe('BilateralService', () => {
  let service: BilateralService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BilateralService],
    }).compile();

    service = module.get<BilateralService>(BilateralService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
