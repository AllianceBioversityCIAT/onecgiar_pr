import { Test, TestingModule } from '@nestjs/testing';
import { BiReportsController } from './bi-reports.controller';
import { BiReportsService } from './bi-reports.service';

describe('BiReportsController', () => {
  let controller: BiReportsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BiReportsController],
      providers: [BiReportsService],
    }).compile();

    controller = module.get<BiReportsController>(BiReportsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
