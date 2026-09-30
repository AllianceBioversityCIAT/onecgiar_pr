import { Logger } from '@nestjs/common';
import { BilateralAiConsumer } from './bilateral-ai.consumer';
import { BilateralAiService } from './services/bilateral-ai.service';
import { BilateralAiDispatchService } from './services/bilateral-ai-dispatch.service';

describe('BilateralAiConsumer', () => {
  let consumer: BilateralAiConsumer;
  let bilateralAiService: jest.Mocked<BilateralAiService>;
  let dispatchService: jest.Mocked<BilateralAiDispatchService>;
  let mockChannelRef: { ack: jest.Mock; nack: jest.Mock };

  const mockMessage = { content: Buffer.from('') };

  beforeEach(() => {
    bilateralAiService = {
      processJob: jest.fn(),
      getJobRaw: jest.fn().mockResolvedValue(null),
    } as any;

    dispatchService = {
      decide: jest.fn(),
    } as any;

    mockChannelRef = { ack: jest.fn(), nack: jest.fn() };

    consumer = new BilateralAiConsumer(bilateralAiService, dispatchService);

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

  describe('process — dispatch decision routing (AIQ-T-2, design.md §2.3)', () => {
    it('acks and never calls processJob when the decision is noop', async () => {
      dispatchService.decide.mockResolvedValue({ kind: 'noop' });
      const context = makeContext();

      await consumer.process({ jobId: 'j1' }, context);

      expect(dispatchService.decide).toHaveBeenCalledWith('j1');
      expect(bilateralAiService.processJob).not.toHaveBeenCalled();
      expect(mockChannelRef.ack).toHaveBeenCalledWith(mockMessage);
      expect(mockChannelRef.nack).not.toHaveBeenCalled();
    });

    it('acks and never calls processJob when the decision is park', async () => {
      dispatchService.decide.mockResolvedValue({ kind: 'park' });
      const context = makeContext();

      await consumer.process({ jobId: 'j1' }, context);

      expect(bilateralAiService.processJob).not.toHaveBeenCalled();
      expect(mockChannelRef.ack).toHaveBeenCalledWith(mockMessage);
      expect(mockChannelRef.nack).not.toHaveBeenCalled();
    });

    it('acks X and never calls processJob when the decision redirects to E (AIQ-DD-3)', async () => {
      dispatchService.decide.mockResolvedValue({
        kind: 'redirect',
        jobId: 'E',
      });
      const context = makeContext();

      await consumer.process({ jobId: 'X' }, context);

      expect(bilateralAiService.processJob).not.toHaveBeenCalled();
      expect(mockChannelRef.ack).toHaveBeenCalledWith(mockMessage);
      expect(mockChannelRef.nack).not.toHaveBeenCalled();
    });

    it('nack-requeues without touching processJob when the decision is lock-timeout', async () => {
      dispatchService.decide.mockResolvedValue({ kind: 'lock-timeout' });
      const context = makeContext();

      await consumer.process({ jobId: 'j1' }, context);

      expect(bilateralAiService.processJob).not.toHaveBeenCalled();
      expect(mockChannelRef.nack).toHaveBeenCalledWith(
        mockMessage,
        false,
        true,
      );
      expect(mockChannelRef.ack).not.toHaveBeenCalled();
    });

    // `AIQ-T-2` attempt 2, Reviewer B item 1: `decide` previously sat outside any try block.
    // Nest's `ServerRMQ` neither acks nor nacks when the handler throws, so a DB blip left the
    // message stuck holding a prefetch slot forever.
    it('nack-requeues without touching processJob when decide() itself rejects', async () => {
      dispatchService.decide.mockRejectedValue(new Error('DB connection lost'));
      const context = makeContext();

      await consumer.process({ jobId: 'j1' }, context);

      expect(bilateralAiService.processJob).not.toHaveBeenCalled();
      expect(mockChannelRef.nack).toHaveBeenCalledWith(
        mockMessage,
        false,
        true,
      );
      expect(mockChannelRef.ack).not.toHaveBeenCalled();
    });

    it('calls processJob with skipClaim:true and acks on success when the decision is run', async () => {
      dispatchService.decide.mockResolvedValue({ kind: 'run' });
      bilateralAiService.processJob.mockResolvedValue(undefined);
      const context = makeContext();

      await consumer.process({ jobId: 'test-job-id-123' }, context);

      expect(bilateralAiService.processJob).toHaveBeenCalledWith(
        'test-job-id-123',
        { skipClaim: true },
      );
      expect(mockChannelRef.ack).toHaveBeenCalledWith(mockMessage);
      expect(mockChannelRef.nack).not.toHaveBeenCalled();
    });

    it("calls processJob with skipClaim:false (today's path) when the decision is resume-retry", async () => {
      dispatchService.decide.mockResolvedValue({ kind: 'resume-retry' });
      bilateralAiService.processJob.mockResolvedValue(undefined);
      const context = makeContext();

      await consumer.process({ jobId: 'retrying-job' }, context);

      expect(bilateralAiService.processJob).toHaveBeenCalledWith(
        'retrying-job',
        { skipClaim: false },
      );
      expect(mockChannelRef.ack).toHaveBeenCalledWith(mockMessage);
    });

    it('nacks on failure when retries remain (run outcome)', async () => {
      dispatchService.decide.mockResolvedValue({ kind: 'run' });
      const error = new Error('Processing failed');
      bilateralAiService.processJob.mockRejectedValue(error);
      bilateralAiService.getJobRaw.mockResolvedValue({ attempts: 0 } as any);
      const context = makeContext();

      await consumer.process({ jobId: 'failing-job-id' }, context);

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

    it('logs an error message when processing fails', async () => {
      dispatchService.decide.mockResolvedValue({ kind: 'run' });
      const error = new Error('AI service error');
      bilateralAiService.processJob.mockRejectedValue(error);
      bilateralAiService.getJobRaw.mockResolvedValue({ attempts: 0 } as any);
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
        dispatchService.decide.mockResolvedValue({ kind: 'run' });
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
        dispatchService.decide.mockResolvedValue({ kind: 'run' });
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
