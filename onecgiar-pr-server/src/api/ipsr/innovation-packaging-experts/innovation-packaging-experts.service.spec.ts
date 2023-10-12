import { Test, TestingModule } from '@nestjs/testing';
import { InnovationPackagingExpertsService } from './innovation-packaging-experts.service';

describe('InnovationPackagingExpertsService', () => {
  let service: InnovationPackagingExpertsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InnovationPackagingExpertsService],
    }).compile();

    service = module.get<InnovationPackagingExpertsService>(
      InnovationPackagingExpertsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
