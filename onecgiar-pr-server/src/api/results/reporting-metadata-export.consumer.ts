import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import type { ReportingMetadataExportJobPayload } from './dto/reporting-metadata-export-job.payload';
import { ReportingFullMetadataExportService } from './services/reporting-full-metadata-export.service';
import { REPORTING_METADATA_EXPORT_RMQ_PATTERN } from '../../shared/microservices/reporting-metadata-export-queue/reporting-metadata-export-queue.constants';

/**
 * RabbitMQ consumer (hybrid app): receives jobs published by
 * ReportingMetadataExportQueuePublisherService.
 */
@Controller()
export class ReportingMetadataExportConsumer {
  private readonly _logger = new Logger(ReportingMetadataExportConsumer.name);

  constructor(
    private readonly _exportService: ReportingFullMetadataExportService,
  ) {}

  @EventPattern(REPORTING_METADATA_EXPORT_RMQ_PATTERN)
  async handle(
    @Payload() payload: ReportingMetadataExportJobPayload,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      await this._exportService.executeQueuedExportJob(payload);
      channel.ack(originalMsg);
    } catch (err) {
      let message: string;
      if (err instanceof Error) {
        message = err.message;
      } else if (typeof err === 'string') {
        message = err;
      } else {
        message = JSON.stringify(err);
      }

      this._logger.error(
        `Error processing export job ${payload.jobId}: ${message}`,
        err instanceof Error ? err.stack : undefined,
      );

      // If it's a validation error (like mixing phases), we should ACK to remove it from queue
      // because retrying won't fix a bad filter selection.
      const isValidationError =
        message.includes('mix P25') ||
        message.includes('Too many results') ||
        message.includes('No results match') ||
        message.includes('No rows were returned from the P25 Excel view');

      if (isValidationError) {
        channel.ack(originalMsg);
      } else {
        // For technical errors (S3, DB connection, etc.), we NACK and requeue
        channel.nack(originalMsg, false, true);
      }
    }
  }
}
