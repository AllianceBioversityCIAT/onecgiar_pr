import { Test, TestingModule } from '@nestjs/testing';
import { InnovationPathwayService } from './innovation-pathway.service';

describe('InnovationPathwayService', () => {
  let service: InnovationPathwayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InnovationPathwayService],
    }).compile();

    service = module.get<InnovationPathwayService>(InnovationPathwayService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
