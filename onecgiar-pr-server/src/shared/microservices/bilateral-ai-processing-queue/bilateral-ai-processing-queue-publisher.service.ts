import { Inject, Injectable, OnModuleInit, Optional } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  BILATERAL_AI_PROCESSING_QUEUE_CLIENT,
  BILATERAL_AI_PROCESSING_RMQ_PATTERN,
  isBilateralAiProcessingQueueConfigured,
} from './bilateral-ai-processing-queue.constants';

export interface BilateralAiProcessingJobPayload {
  jobId: string;
}

@Injectable()
export class BilateralAiProcessingQueuePublisherService
  implements OnModuleInit
{
  constructor(
    @Optional()
    @Inject(BILATERAL_AI_PROCESSING_QUEUE_CLIENT)
    private readonly client?: ClientProxy,
  ) {}

  isEnabled(): boolean {
    return isBilateralAiProcessingQueueConfigured() && !!this.client;
  }

  async onModuleInit(): Promise<void> {
    if (!this.isEnabled() || !this.client) return;
    await this.client.connect();
  }

  publish(payload: BilateralAiProcessingJobPayload): void {
    if (!this.client || !this.isEnabled()) {
      throw new Error('Bilateral AI processing queue is not configured');
    }
    this.client.emit(BILATERAL_AI_PROCESSING_RMQ_PATTERN, payload);
  }
}
