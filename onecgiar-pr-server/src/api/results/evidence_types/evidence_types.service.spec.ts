import { Test, TestingModule } from '@nestjs/testing';
import { EvidenceTypesService } from './evidence_types.service';

describe('EvidenceTypesService', () => {
  let service: EvidenceTypesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EvidenceTypesService],
    }).compile();

    service = module.get<EvidenceTypesService>(EvidenceTypesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
