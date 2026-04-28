import { BasicReportFiltersDto } from './basic-report-filters.dto';

/** Payload sent through RabbitMQ for full-metadata export jobs (must stay JSON-serializable). */
export type ReportingMetadataExportUserSnapshot = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
};

export type ReportingMetadataExportJobPayload = {
  jobId: string;
  filters: BasicReportFiltersDto;
  user: ReportingMetadataExportUserSnapshot;
};
