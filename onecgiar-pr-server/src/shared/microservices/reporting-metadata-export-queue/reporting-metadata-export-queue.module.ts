import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { env } from 'node:process';
import {
  isReportingMetadataExportQueueConfigured,
  REPORTING_METADATA_EXPORT_QUEUE_CLIENT,
} from './reporting-metadata-export-queue.constants';
import { ReportingMetadataExportQueuePublisherService } from './reporting-metadata-export-queue-publisher.service';

const queueEnabled = isReportingMetadataExportQueueConfigured();

@Module({
  imports: queueEnabled
    ? [
        ClientsModule.register([
          {
            name: REPORTING_METADATA_EXPORT_QUEUE_CLIENT,
            transport: Transport.RMQ,
            options: {
              urls: [env.RABBITMQ_URL],
              queue: env.REPORTING_METADATA_EXPORT_QUEUE,
              queueOptions: { durable: true },
            },
          },
        ]),
      ]
    : [],
  providers: [ReportingMetadataExportQueuePublisherService],
  exports: [ReportingMetadataExportQueuePublisherService],
})
export class ReportingMetadataExportQueueModule {}
