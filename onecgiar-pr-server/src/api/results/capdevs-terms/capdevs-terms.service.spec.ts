import { Test, TestingModule } from '@nestjs/testing';
import { CapdevsTermsService } from './capdevs-terms.service';

describe('CapdevsTermsService', () => {
  let service: CapdevsTermsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CapdevsTermsService],
    }).compile();

    service = module.get<CapdevsTermsService>(CapdevsTermsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
