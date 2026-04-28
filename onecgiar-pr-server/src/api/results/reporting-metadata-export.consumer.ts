import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
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
  ): Promise<void> {
    await this._exportService.executeQueuedExportJob(payload);
  }
}
