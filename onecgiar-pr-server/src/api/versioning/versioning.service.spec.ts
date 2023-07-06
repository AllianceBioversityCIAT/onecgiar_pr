import { Test, TestingModule } from '@nestjs/testing';
import { VersioningService } from './versioning.service';

describe('VersioningService', () => {
  let service: VersioningService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VersioningService],
    }).compile();

    service = module.get<VersioningService>(VersioningService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
