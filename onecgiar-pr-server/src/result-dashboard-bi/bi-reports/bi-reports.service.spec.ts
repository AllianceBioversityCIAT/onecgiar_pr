import { Test, TestingModule } from '@nestjs/testing';
import { BiReportsService } from './bi-reports.service';

describe('BiReportsService', () => {
  let service: BiReportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BiReportsService],
    }).compile();

    service = module.get<BiReportsService>(BiReportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
