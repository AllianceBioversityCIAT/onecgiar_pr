import { Test, TestingModule } from '@nestjs/testing';
import { PublicReportService } from './public-report.service';

describe('PublicReportService', () => {
  let service: PublicReportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PublicReportService],
    }).compile();

    service = module.get<PublicReportService>(PublicReportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
