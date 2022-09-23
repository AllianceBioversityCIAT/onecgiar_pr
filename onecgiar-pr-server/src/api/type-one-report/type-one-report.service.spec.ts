import { Test, TestingModule } from '@nestjs/testing';
import { TypeOneReportService } from './type-one-report.service';

describe('TypeOneReportService', () => {
  let service: TypeOneReportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TypeOneReportService],
    }).compile();

    service = module.get<TypeOneReportService>(TypeOneReportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
