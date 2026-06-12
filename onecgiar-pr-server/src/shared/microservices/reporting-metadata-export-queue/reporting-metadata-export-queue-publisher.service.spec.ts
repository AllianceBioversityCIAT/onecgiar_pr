import { Test, TestingModule } from '@nestjs/testing';
import * as constants from './reporting-metadata-export-queue.constants';
import { REPORTING_METADATA_EXPORT_QUEUE_CLIENT } from './reporting-metadata-export-queue.constants';
import { ReportingMetadataExportQueuePublisherService } from './reporting-metadata-export-queue-publisher.service';

describe('ReportingMetadataExportQueuePublisherService', () => {
  let service: ReportingMetadataExportQueuePublisherService;
  let mockClient: { connect: jest.Mock; emit: jest.Mock };

  const payload = {
    jobId: 'job-1',
    filters: {},
    user: {
      id: 1,
      email: 'u@test.org',
      first_name: 'A',
      last_name: 'B',
    },
  };

  beforeEach(() => {
    jest.restoreAllMocks();
    mockClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn(),
    };
  });

  describe('isEnabled', () => {
    it('returns false when client is undefined', () => {
      jest
        .spyOn(constants, 'isReportingMetadataExportQueueConfigured')
        .mockReturnValue(true);
      service = new ReportingMetadataExportQueuePublisherService(undefined);

      expect(service.isEnabled()).toBe(false);
    });

    it('returns false when queue env not configured even if client exists', () => {
      jest
        .spyOn(constants, 'isReportingMetadataExportQueueConfigured')
        .mockReturnValue(false);
      service = new ReportingMetadataExportQueuePublisherService(
        mockClient as any,
      );

      expect(service.isEnabled()).toBe(false);
      expect(mockClient.connect).not.toHaveBeenCalled();
    });

    it('returns true when env configured and client is injected', () => {
      jest
        .spyOn(constants, 'isReportingMetadataExportQueueConfigured')
        .mockReturnValue(true);
      service = new ReportingMetadataExportQueuePublisherService(
        mockClient as any,
      );

      expect(service.isEnabled()).toBe(true);
    });
  });

  describe('onModuleInit', () => {
    it('skips connect when disabled', async () => {
      jest
        .spyOn(constants, 'isReportingMetadataExportQueueConfigured')
        .mockReturnValue(false);
      service = new ReportingMetadataExportQueuePublisherService(
        mockClient as any,
      );

      await service.onModuleInit();

      expect(mockClient.connect).not.toHaveBeenCalled();
    });

    it('connects when enabled', async () => {
      jest
        .spyOn(constants, 'isReportingMetadataExportQueueConfigured')
        .mockReturnValue(true);
      service = new ReportingMetadataExportQueuePublisherService(
        mockClient as any,
      );

      await service.onModuleInit();

      expect(mockClient.connect).toHaveBeenCalledTimes(1);
    });

    it('logs error when connect rejects', async () => {
      jest
        .spyOn(constants, 'isReportingMetadataExportQueueConfigured')
        .mockReturnValue(true);
      mockClient.connect.mockRejectedValueOnce(new Error('broker down'));
      service = new ReportingMetadataExportQueuePublisherService(
        mockClient as any,
      );

      await expect(service.onModuleInit()).resolves.toBeUndefined();
      expect(mockClient.connect).toHaveBeenCalled();
    });
  });

  describe('publishExportJob', () => {
    beforeEach(() => {
      jest
        .spyOn(constants, 'isReportingMetadataExportQueueConfigured')
        .mockReturnValue(true);
      service = new ReportingMetadataExportQueuePublisherService(
        mockClient as any,
      );
    });

    it('throws when client is missing', () => {
      const bare = new ReportingMetadataExportQueuePublisherService(undefined);

      expect(() => bare.publishExportJob(payload as any)).toThrow(
        'Reporting metadata export queue is not configured',
      );
    });

    it('emits payload with RMQ pattern', () => {
      service.publishExportJob(payload as any);

      expect(mockClient.emit).toHaveBeenCalledTimes(1);
      expect(mockClient.emit).toHaveBeenCalledWith(
        constants.REPORTING_METADATA_EXPORT_RMQ_PATTERN,
        payload,
      );
    });
  });

  describe('Nest module wiring', () => {
    it('resolves publisher with mocked ClientProxy', async () => {
      jest
        .spyOn(constants, 'isReportingMetadataExportQueueConfigured')
        .mockReturnValue(true);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ReportingMetadataExportQueuePublisherService,
          {
            provide: REPORTING_METADATA_EXPORT_QUEUE_CLIENT,
            useValue: mockClient,
          },
        ],
      }).compile();

      const resolved = module.get(ReportingMetadataExportQueuePublisherService);
      expect(resolved.isEnabled()).toBe(true);
    });
  });
});
