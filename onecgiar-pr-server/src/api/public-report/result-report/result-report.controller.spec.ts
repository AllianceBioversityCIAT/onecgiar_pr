import { Test, TestingModule } from '@nestjs/testing';
import { ResultReportController } from './result-report.controller';
import { ResultReportService } from './result-report.service';

describe('ResultReportController', () => {
  let controller: ResultReportController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultReportController],
      providers: [ResultReportService],
    }).compile();

    controller = module.get<ResultReportController>(ResultReportController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
