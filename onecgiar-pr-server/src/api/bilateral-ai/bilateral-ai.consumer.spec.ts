import { Logger } from '@nestjs/common';
import { BilateralAiConsumer } from './bilateral-ai.consumer';
import { BilateralAiService } from './services/bilateral-ai.service';

describe('BilateralAiConsumer', () => {
  let consumer: BilateralAiConsumer;
  let bilateralAiService: jest.Mocked<BilateralAiService>;
  let mockChannelRef: { ack: jest.Mock; nack: jest.Mock };

  const mockMessage = { content: Buffer.from('') };

  beforeEach(() => {
    bilateralAiService = {
      processJob: jest.fn(),
      getJobRaw: jest.fn().mockResolvedValue(null),
    } as any;

    mockChannelRef = { ack: jest.fn(), nack: jest.fn() };

    consumer = new BilateralAiConsumer(bilateralAiService);

    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const makeContext = () =>
    ({
      getChannelRef: jest.fn().mockReturnValue(mockChannelRef),
      getMessage: jest.fn().mockReturnValue(mockMessage),
    }) as any;

  it('should be defined', () => {
    expect(consumer).toBeDefined();
  });

  describe('process', () => {
    it('should call bilateralAiService.processJob and ack the message on success', async () => {
      bilateralAiService.processJob.mockResolvedValue(undefined);
      const context = makeContext();

      await consumer.process({ jobId: 'test-job-id-123' }, context);

      expect(bilateralAiService.processJob).toHaveBeenCalledWith(
        'test-job-id-123',
      );
      expect(mockChannelRef.ack).toHaveBeenCalledWith(mockMessage);
      expect(mockChannelRef.nack).not.toHaveBeenCalled();
    });

    it('should nack the message on failure when retries remain', async () => {
      const error = new Error('Processing failed');
      bilateralAiService.processJob.mockRejectedValue(error);
      bilateralAiService.getJobRaw.mockResolvedValue({
        attempts: 0,
      } as any);
      const context = makeContext();

      await consumer.process({ jobId: 'failing-job-id' }, context);

      expect(bilateralAiService.processJob).toHaveBeenCalledWith(
        'failing-job-id',
      );
      expect(bilateralAiService.getJobRaw).toHaveBeenCalledWith(
        'failing-job-id',
      );
      expect(mockChannelRef.nack).toHaveBeenCalledWith(
        mockMessage,
        false,
        true,
      );
      expect(mockChannelRef.ack).not.toHaveBeenCalled();
    });

    it('should log an error message when processing fails', async () => {
      const error = new Error('AI service error');
      bilateralAiService.processJob.mockRejectedValue(error);
      bilateralAiService.getJobRaw.mockResolvedValue({
        attempts: 0,
      } as any);
      const context = makeContext();
      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      await consumer.process({ jobId: 'err-job' }, context);

      expect(errorSpy).toHaveBeenCalledWith(
        'Bilateral AI job err-job will be retried (attempt 0/3): AI service error',
      );
    });
  });
});
