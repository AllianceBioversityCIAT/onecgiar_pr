import { Test, TestingModule } from '@nestjs/testing';
import { PlatformReportController } from './platform-report.controller';
import { PlatformReportService } from './platform-report.service';

describe('PlatformReportController', () => {
  let controller: PlatformReportController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlatformReportController],
      providers: [PlatformReportService],
    }).compile();

    controller = module.get<PlatformReportController>(PlatformReportController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
