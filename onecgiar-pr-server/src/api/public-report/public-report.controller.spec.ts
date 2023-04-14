import { Test, TestingModule } from '@nestjs/testing';
import { PublicReportController } from './public-report.controller';
import { PublicReportService } from './public-report.service';

describe('PublicReportController', () => {
  let controller: PublicReportController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicReportController],
      providers: [PublicReportService],
    }).compile();

    controller = module.get<PublicReportController>(PublicReportController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
