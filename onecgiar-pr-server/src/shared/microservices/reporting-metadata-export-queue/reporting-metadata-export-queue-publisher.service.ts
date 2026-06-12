import {
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import type { ReportingMetadataExportJobPayload } from '../../../api/results/dto/reporting-metadata-export-job.payload';
import {
  isReportingMetadataExportQueueConfigured,
  REPORTING_METADATA_EXPORT_QUEUE_CLIENT,
  REPORTING_METADATA_EXPORT_RMQ_PATTERN,
} from './reporting-metadata-export-queue.constants';

@Injectable()
export class ReportingMetadataExportQueuePublisherService
  implements OnModuleInit
{
  private readonly _logger = new Logger(
    ReportingMetadataExportQueuePublisherService.name,
  );

  constructor(
    @Optional()
    @Inject(REPORTING_METADATA_EXPORT_QUEUE_CLIENT)
    private readonly _client: ClientProxy | undefined,
  ) {}

  isEnabled(): boolean {
    return (
      isReportingMetadataExportQueueConfigured() && this._client !== undefined
    );
  }

  async onModuleInit(): Promise<void> {
    if (!this.isEnabled() || !this._client) {
      this._logger.log(
        'Reporting metadata export queue publisher disabled (set REPORTING_METADATA_EXPORT_QUEUE + RABBITMQ_URL).',
      );
      return;
    }
    try {
      await this._client.connect();
      this._logger.log(
        'Connected to RabbitMQ (reporting metadata export publisher).',
      );
    } catch (e) {
      this._logger.error(
        'Failed to connect RabbitMQ reporting metadata export publisher',
        e instanceof Error ? e.message : e,
      );
    }
  }

  /** Fire-and-forget publish; consumer runs executeQueuedExportJob. */
  publishExportJob(payload: ReportingMetadataExportJobPayload): void {
    if (!this._client) {
      throw new Error('Reporting metadata export queue is not configured');
    }
    this._client.emit(REPORTING_METADATA_EXPORT_RMQ_PATTERN, payload);
  }
}
