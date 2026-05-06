import { env } from 'node:process';

/** Nest DI token for the RMQ ClientProxy (same logical queue as the microservice consumer). */
export const REPORTING_METADATA_EXPORT_QUEUE_CLIENT =
  'REPORTING_METADATA_EXPORT_QUEUE_CLIENT';

/** Event pattern: must match @EventPattern and publisher emit. */
export const REPORTING_METADATA_EXPORT_RMQ_PATTERN =
  'reporting_full_metadata_export';

export function isReportingMetadataExportQueueConfigured(): boolean {
  return (
    !!env.REPORTING_METADATA_EXPORT_QUEUE?.trim() && !!env.RABBITMQ_URL?.trim()
  );
}
