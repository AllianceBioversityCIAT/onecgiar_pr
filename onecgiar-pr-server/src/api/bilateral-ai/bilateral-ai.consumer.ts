import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { BILATERAL_AI_PROCESSING_RMQ_PATTERN } from '../../shared/microservices/bilateral-ai-processing-queue/bilateral-ai-processing-queue.constants';
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
    try {
      await this.bilateralAiService.processJob(payload.jobId);
      context.getChannelRef().ack(context.getMessage());
    } catch (error) {
      this.logger.error('Bilateral AI job processing will be retried.');
      context.getChannelRef().nack(context.getMessage(), false, true);
      throw error;
    }
  }
}
