import { Test, TestingModule } from '@nestjs/testing';
import { TypeOneReportController } from './type-one-report.controller';
import { TypeOneReportService } from './type-one-report.service';

describe('TypeOneReportController', () => {
  let controller: TypeOneReportController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TypeOneReportController],
      providers: [TypeOneReportService],
    }).compile();

    controller = module.get<TypeOneReportController>(TypeOneReportController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
