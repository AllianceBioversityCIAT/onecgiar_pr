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

    // `design.md` §5 "Retry semantics": the consumer's nack/ack ceiling reads the same
    // `BILATERAL_AI_MAX_ATTEMPTS` env `processJob`'s attempt-start reads — no hardcoded
    // `maxRetries = 3` (`APF-DD-3` item 5).
    describe('BILATERAL_AI_MAX_ATTEMPTS drives the nack/ack decision', () => {
      const original = process.env.BILATERAL_AI_MAX_ATTEMPTS;

      afterEach(() => {
        if (original === undefined)
          delete process.env.BILATERAL_AI_MAX_ATTEMPTS;
        else process.env.BILATERAL_AI_MAX_ATTEMPTS = original;
      });

      it('acks (stops requeueing) once attempts reach a lowered ceiling of 2', async () => {
        process.env.BILATERAL_AI_MAX_ATTEMPTS = '2';
        const error = new Error('Processing failed');
        bilateralAiService.processJob.mockRejectedValue(error);
        bilateralAiService.getJobRaw.mockResolvedValue({ attempts: 2 } as any);
        const context = makeContext();

        await consumer.process({ jobId: 'capped-job' }, context);

        expect(mockChannelRef.ack).toHaveBeenCalledWith(mockMessage);
        expect(mockChannelRef.nack).not.toHaveBeenCalled();
      });

      it('still nacks (requeues) below a lowered ceiling of 2', async () => {
        process.env.BILATERAL_AI_MAX_ATTEMPTS = '2';
        const error = new Error('Processing failed');
        bilateralAiService.processJob.mockRejectedValue(error);
        bilateralAiService.getJobRaw.mockResolvedValue({ attempts: 1 } as any);
        const context = makeContext();

        await consumer.process({ jobId: 'still-retrying-job' }, context);

        expect(mockChannelRef.nack).toHaveBeenCalledWith(
          mockMessage,
          false,
          true,
        );
        expect(mockChannelRef.ack).not.toHaveBeenCalled();
      });
    });
  });
});
