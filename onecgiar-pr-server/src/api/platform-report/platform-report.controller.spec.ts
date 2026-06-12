import { Test, TestingModule } from '@nestjs/testing';
import { PlatformReportController } from './platform-report.controller';
import { PlatformReportService } from './platform-report.service';
import { PlatformReportEnum } from './entities/platform-report.enum';

describe('PlatformReportController', () => {
  let controller: PlatformReportController;

  const mockService = {
    getFullResultReportByResultCode: jest.fn(),
  } as unknown as jest.Mocked<PlatformReportService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlatformReportController],
      providers: [{ provide: PlatformReportService, useValue: mockService }],
    }).compile();

    controller = module.get(PlatformReportController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getFullResultReportByResultCode', () => {
    it('trims code and phase and delegates to service with FULL_RESULT_REPORT', async () => {
      const mockResult = {
        pdf: 'https://example.com/a.pdf',
        fileName: 'a.pdf',
      };
      mockService.getFullResultReportByResultCode.mockResolvedValue(mockResult);

      const result = await controller.getFullResultReportByResultCode(
        '  123  ',
        { phase: '  2  ', downloadable: false },
      );

      expect(mockService.getFullResultReportByResultCode).toHaveBeenCalledWith(
        '123',
        '2',
        PlatformReportEnum.FULL_RESULT_REPORT,
      );
      expect(result).toEqual(mockResult);
    });

    it('returns service result as-is', async () => {
      const mockResult = {
        pdf: 'https://bucket.s3.amazonaws.com/x.pdf',
        fileName: 'x.pdf',
      };
      mockService.getFullResultReportByResultCode.mockResolvedValue(mockResult);

      const result = await controller.getFullResultReportByResultCode('456', {
        phase: '1',
        downloadable: true,
      });

      expect(result).toEqual(mockResult);
    });

    it('returns error shape when service throws', async () => {
      const errorDto = { status: 404, message: 'Not found', response: null };
      mockService.getFullResultReportByResultCode.mockResolvedValue(errorDto);

      const result = await controller.getFullResultReportByResultCode('999', {
        phase: '1',
        downloadable: false,
      });

      expect(result).toEqual(errorDto);
    });
  });

  describe('getFullIPSRReportByCode', () => {
    it('trims code and phase and delegates to service with FULL_IPSR_REPORT', async () => {
      const mockResult = {
        pdf: 'https://example.com/ipsr.pdf',
        fileName: 'ipsr.pdf',
      };
      mockService.getFullResultReportByResultCode.mockResolvedValue(mockResult);

      const result = await controller.getFullIPSRReportByCode('  789  ', {
        phase: '  3  ',
        downloadable: false,
      });

      expect(mockService.getFullResultReportByResultCode).toHaveBeenCalledWith(
        '789',
        '3',
        PlatformReportEnum.FULL_IPSR_REPORT,
      );
      expect(result).toEqual(mockResult);
    });
  });
});
