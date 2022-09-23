import { Test, TestingModule } from '@nestjs/testing';
import { EvidencesService } from './evidences.service';

describe('EvidencesService', () => {
  let service: EvidencesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EvidencesService],
    }).compile();

    service = module.get<EvidencesService>(EvidencesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
