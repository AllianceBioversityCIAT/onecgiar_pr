import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { BILATERAL_AI_PROCESSING_RMQ_PATTERN } from '../../shared/microservices/bilateral-ai-processing-queue/bilateral-ai-processing-queue.constants';
import { getBilateralAiMaxAttempts } from './bilateral-ai.config';
import { BilateralAiService } from './services/bilateral-ai.service';

@Controller()
export class BilateralAiConsumer {
  private readonly logger = new Logger(BilateralAiConsumer.name);

  constructor(private readonly bilateralAiService: BilateralAiService) {}

  @EventPattern(BILATERAL_AI_PROCESSING_RMQ_PATTERN)
  async process(
    @Payload() payload: { jobId: string },
    @Ctx() context: RmqContext,
  ) {
    // `BILATERAL_AI_MAX_ATTEMPTS` (design.md §5 "Retry semantics") — the same ceiling
    // `processJob`'s attempt-start reads; a second, hardcoded ceiling here would strand a
    // `retrying = 1` job the moment the two disagree (`APF-DD-3`).
    const maxRetries = getBilateralAiMaxAttempts();
    try {
      await this.bilateralAiService.processJob(payload.jobId);
      context.getChannelRef().ack(context.getMessage());
    } catch (error) {
      const job = await this.bilateralAiService.getJobRaw(payload.jobId);
      const attempts = job?.attempts ?? 0;
      const reason = error instanceof Error ? error.message : 'Unknown error';
      if (attempts < maxRetries) {
        this.logger.error(
          `Bilateral AI job ${payload.jobId} will be retried (attempt ${attempts}/${maxRetries}): ${reason}`,
        );
        context.getChannelRef().nack(context.getMessage(), false, true);
      } else {
        this.logger.error(
          `Bilateral AI job ${payload.jobId} failed after ${maxRetries} attempts. Discarding. Last error: ${reason}`,
        );
        context.getChannelRef().ack(context.getMessage());
      }
    }
  }
}
