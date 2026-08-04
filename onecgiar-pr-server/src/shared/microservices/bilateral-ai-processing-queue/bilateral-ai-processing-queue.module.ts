import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { env } from 'node:process';
import {
  BILATERAL_AI_PROCESSING_QUEUE_CLIENT,
  isBilateralAiProcessingQueueConfigured,
} from './bilateral-ai-processing-queue.constants';
import { BilateralAiProcessingQueuePublisherService } from './bilateral-ai-processing-queue-publisher.service';

@Module({
  imports: isBilateralAiProcessingQueueConfigured()
    ? [
        ClientsModule.register([
          {
            name: BILATERAL_AI_PROCESSING_QUEUE_CLIENT,
            transport: Transport.RMQ,
            options: {
              urls: [env.RABBITMQ_URL],
              queue: env.BILATERAL_AI_PROCESSING_QUEUE,
              queueOptions: { durable: true },
            },
          },
        ]),
      ]
    : [],
  providers: [BilateralAiProcessingQueuePublisherService],
  exports: [BilateralAiProcessingQueuePublisherService],
})
export class BilateralAiProcessingQueueModule {}
