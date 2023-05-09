import { Test, TestingModule } from '@nestjs/testing';
import { PlatformReportService } from './platform-report.service';

describe('PlatformReportService', () => {
  let service: PlatformReportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlatformReportService],
    }).compile();

    service = module.get<PlatformReportService>(PlatformReportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
