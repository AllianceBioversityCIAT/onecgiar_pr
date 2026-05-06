import {
  isReportingMetadataExportQueueConfigured,
  REPORTING_METADATA_EXPORT_RMQ_PATTERN,
} from './reporting-metadata-export-queue.constants';

describe('reporting-metadata-export-queue.constants', () => {
  const savedQueue = process.env.REPORTING_METADATA_EXPORT_QUEUE;
  const savedUrl = process.env.RABBITMQ_URL;

  afterEach(() => {
    if (savedQueue === undefined) {
      delete process.env.REPORTING_METADATA_EXPORT_QUEUE;
    } else {
      process.env.REPORTING_METADATA_EXPORT_QUEUE = savedQueue;
    }
    if (savedUrl === undefined) {
      delete process.env.RABBITMQ_URL;
    } else {
      process.env.RABBITMQ_URL = savedUrl;
    }
  });

  it('exports stable RMQ pattern string', () => {
    expect(REPORTING_METADATA_EXPORT_RMQ_PATTERN).toBe(
      'reporting_full_metadata_export',
    );
    expect(typeof REPORTING_METADATA_EXPORT_RMQ_PATTERN).toBe('string');
  });

  it('isReportingMetadataExportQueueConfigured returns false when queue env empty', () => {
    process.env.REPORTING_METADATA_EXPORT_QUEUE = '';
    process.env.RABBITMQ_URL = 'amqp://localhost';

    expect(isReportingMetadataExportQueueConfigured()).toBe(false);
  });

  it('isReportingMetadataExportQueueConfigured returns false when queue is whitespace only', () => {
    process.env.REPORTING_METADATA_EXPORT_QUEUE = '   ';
    process.env.RABBITMQ_URL = 'amqp://localhost';

    expect(isReportingMetadataExportQueueConfigured()).toBe(false);
  });

  it('isReportingMetadataExportQueueConfigured returns false when RABBITMQ_URL missing', () => {
    process.env.REPORTING_METADATA_EXPORT_QUEUE = 'reporting_export_q';
    delete process.env.RABBITMQ_URL;

    expect(isReportingMetadataExportQueueConfigured()).toBe(false);
  });

  it('isReportingMetadataExportQueueConfigured returns true when both are non-empty', () => {
    process.env.REPORTING_METADATA_EXPORT_QUEUE = 'reporting_export_q';
    process.env.RABBITMQ_URL = 'amqp://guest:guest@localhost:5672';

    expect(isReportingMetadataExportQueueConfigured()).toBe(true);
  });
});
