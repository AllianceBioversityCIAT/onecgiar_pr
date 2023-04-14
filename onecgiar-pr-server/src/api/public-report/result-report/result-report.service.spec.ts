import { Test, TestingModule } from '@nestjs/testing';
import { ResultReportService } from './result-report.service';

describe('ResultReportService', () => {
  let service: ResultReportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultReportService],
    }).compile();

    service = module.get<ResultReportService>(ResultReportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
