import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';

import { TypeOneReportService } from './type-one-report.service';
import { TypeOneReportRepository } from './type-one-report.repository';
import { ReturnResponse } from '../../shared/handlers/error.utils';

describe('TypeOneReportService', () => {
  let service: TypeOneReportService;

  const mockRepo = {
    getFactSheetByInit: jest.fn(),
    getKeyResultStory: jest.fn(),
  } as unknown as jest.Mocked<TypeOneReportRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TypeOneReportService,
        ReturnResponse,
        { provide: TypeOneReportRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get(TypeOneReportService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getFactSheetByInit', () => {
    it('returns first element of repository response with OK status', async () => {
      (mockRepo.getFactSheetByInit as jest.Mock).mockResolvedValueOnce([
        { a: 1 },
        { a: 2 },
      ]);

      const res = await service.getFactSheetByInit(1);
      expect(mockRepo.getFactSheetByInit).toHaveBeenCalledWith(1);
      expect(res.statusCode).toBe(HttpStatus.OK);
      expect(res.response).toEqual({ a: 1 });
      expect(res.message).toBe('Successful response');
    });

    it('handles errors via ReturnResponse', async () => {
      (mockRepo.getFactSheetByInit as jest.Mock).mockRejectedValueOnce(
        new Error('boom'),
      );
      const res = await service.getFactSheetByInit(2);
      expect(res.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(res.message).toBe('boom');
    });
  });

  describe('getKeyResultStory', () => {
    it('returns repository response with OK status', async () => {
      const payload = [{ id: 10 }];
      (mockRepo.getKeyResultStory as jest.Mock).mockResolvedValueOnce(payload);

      const res = await service.getKeyResultStory(5, 7);
      expect(mockRepo.getKeyResultStory).toHaveBeenCalledWith(5, 7);
      expect(res.statusCode).toBe(HttpStatus.OK);
      expect(res.response).toEqual(payload);
      expect(res.message).toBe('Successful response');
    });

    it('handles errors via ReturnResponse', async () => {
      (mockRepo.getKeyResultStory as jest.Mock).mockRejectedValueOnce(
        new Error('fail'),
      );
      const res = await service.getKeyResultStory(1, 1);
      expect(res.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(res.message).toBe('fail');
    });
  });
});

