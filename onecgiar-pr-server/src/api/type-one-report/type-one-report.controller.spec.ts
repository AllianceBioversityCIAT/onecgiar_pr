import { Test, TestingModule } from '@nestjs/testing';
import { TypeOneReportController } from './type-one-report.controller';
import { TypeOneReportService } from './type-one-report.service';

describe('TypeOneReportController', () => {
  let controller: TypeOneReportController;

  const mockService = {
    getFactSheetByInit: jest
      .fn()
      .mockResolvedValue({ statusCode: 200, response: {} }),
    getKeyResultStory: jest
      .fn()
      .mockResolvedValue({ statusCode: 200, response: [] }),
  } as unknown as jest.Mocked<TypeOneReportService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TypeOneReportController],
      providers: [{ provide: TypeOneReportService, useValue: mockService }],
    }).compile();

    controller = module.get(TypeOneReportController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getFactSheetByInit delegates to service with initId', async () => {
    const res = await controller.getFactSheetByInit(5);
    expect(mockService.getFactSheetByInit).toHaveBeenCalledWith(5);
    expect(res.statusCode).toBe(200);
  });

  it('getKeyResultStoryByInt casts phase to number and delegates', async () => {
    const res = await controller.getKeyResultStoryByInt(7, '3');
    expect(mockService.getKeyResultStory).toHaveBeenCalledWith(7, 3);
    expect(res.statusCode).toBe(200);
  });
});
