import { Test, TestingModule } from '@nestjs/testing';
import { OstMeliaStudiesService } from './ost-melia-studies.service';

describe('OstMeliaStudiesService', () => {
  let service: OstMeliaStudiesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OstMeliaStudiesService],
    }).compile();

    service = module.get<OstMeliaStudiesService>(OstMeliaStudiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
