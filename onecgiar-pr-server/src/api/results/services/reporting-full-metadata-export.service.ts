import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { env } from 'node:process';
import * as AWS from 'aws-sdk';
import ExcelJS from 'exceljs';
import { EmailNotificationManagementService } from '../../../shared/microservices/email-notification-management/email-notification-management.service';
import { ResultsService } from '../results.service';
import { BasicReportFiltersDto } from '../dto/basic-report-filters.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ConfigMessageDto } from '../../../shared/microservices/email-notification-management/dto/send-email.dto';
import { ReportingMetadataExportQueuePublisherService } from '../../../shared/microservices/reporting-metadata-export-queue/reporting-metadata-export-queue-publisher.service';
import type { ReportingMetadataExportJobPayload } from '../dto/reporting-metadata-export-job.payload';

export type ReportingExportJobStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed';

export interface ReportingExportJob {
  status: ReportingExportJobStatus;
  userId: number;
  createdAt: Date;
  errorMessage?: string;
  downloadUrl?: string;
  fileName?: string;
  rowCount?: number;
}

function defaultMaxRows(): number | null {
  const raw = env.RESULT_METADATA_EXPORT_MAX_ROWS;
  if (!raw?.trim()) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** P25 phases that should use the tabular view path (comma-separated years, default: 2025). */
function p25PhaseYears(): number[] {
  const raw = env.RESULT_FULL_METADATA_P25_PHASE_YEARS?.trim() || '2025';
  const years = raw
    .split(',')
    .map((y) => Number.parseInt(y.trim(), 10))
    .filter((y) => Number.isFinite(y));
  return years.length ? years : [2025];
}

function getThrownMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    typeof (err as { message: unknown }).message === 'string'
  ) {
    return (err as { message: string }).message;
  }
  if (typeof err === 'string') {
    return err;
  }
  if (typeof err === 'object' && err !== null) {
    try {
      return JSON.stringify(err);
    } catch {
      return 'Unserializable object';
    }
  }
  if (err === undefined) {
    return 'undefined';
  }
  if (err === null) {
    return 'null';
  }
  if (
    typeof err === 'number' ||
    typeof err === 'boolean' ||
    typeof err === 'bigint' ||
    typeof err === 'symbol'
  ) {
    return String(err);
  }
  if (typeof err === 'function') {
    const fn = err as { name?: string };
    return `[function ${fn.name?.trim() ? fn.name : 'anonymous'}]`;
  }
  return 'Unknown error value';
}

function sanitizeSheetName(name: string): string {
  const cleaned = name.replaceAll(/[:\\/*?[\]]/g, '_').trim() || 'Sheet';
  return cleaned.length > 31 ? cleaned.slice(0, 31) : cleaned;
}

function normalizeTabularRow(
  row: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v !== null && typeof v === 'object') {
      out[k] = JSON.stringify(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

const P25_REQUIRED_COLUMNS = [
  'result_code',
  'phase_name',
  'portfolio_acronym',
  'result_level',
  'result_type',
  'submission_status',
  'title',
  'result_description',
  'primary_submitter_acronym',
] as const;

function normalizeRequestedP25Columns(selectedColumns?: string[]): string[] {
  const requested = (selectedColumns ?? [])
    .map((c) => c?.trim())
    .filter((c): c is string => !!c);
  return Array.from(new Set([...P25_REQUIRED_COLUMNS, ...requested]));
}

function pickColumns(
  row: Record<string, unknown>,
  orderedColumns: string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const c of orderedColumns) {
    out[c] = row[c] ?? '';
  }
  return out;
}

/** Sheet grouping key: avoids String(object) → '[object Object]' for unknown cell values. */
function tabularResultTypeKey(value: unknown, fallback: string): string {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }
  if (typeof value === 'symbol') {
    return value.toString();
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

@Injectable()
export class ReportingFullMetadataExportService {
  private readonly _logger = new Logger(
    ReportingFullMetadataExportService.name,
  );
  private readonly _jobs = new Map<string, ReportingExportJob>();

  constructor(
    private readonly _resultsService: ResultsService,
    private readonly _emailNotificationService: EmailNotificationManagementService,
    private readonly _metadataExportQueue: ReportingMetadataExportQueuePublisherService,
  ) {}

  getJob(jobId: string, userId: number): ReportingExportJob | null {
    const job = this._jobs.get(jobId);
    if (job?.userId !== userId) return null;
    return { ...job };
  }

  /**
   * Accepts the same filter body as POST get/reporting/list.
   * When REPORTING_METADATA_EXPORT_QUEUE (+ RABBITMQ_URL) are set, work is dispatched to RabbitMQ
   * and processed by ReportingMetadataExportConsumer; otherwise setImmediate (same Node process).
   * Email → EmailNotificationManagementService → RMQ email MS.
   */
  enqueueExport(
    filters: BasicReportFiltersDto,
    user: TokenDto,
  ): {
    jobId: string;
  } {
    const jobId = randomUUID();
    this._jobs.set(jobId, {
      status: 'queued',
      userId: user.id,
      createdAt: new Date(),
    });

    if (this._metadataExportQueue.isEnabled()) {
      this._metadataExportQueue.publishExportJob({
        jobId,
        filters,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
        },
      });
    } else {
      setImmediate(() => {
        void this._runExportJob(jobId, filters, user).catch((err: unknown) => {
          this._failJob(jobId, err);
        });
      });
    }

    return { jobId };
  }

  /** Called from RabbitMQ consumer (see ReportingMetadataExportConsumer). */
  async executeQueuedExportJob(
    payload: ReportingMetadataExportJobPayload,
  ): Promise<void> {
    const user: TokenDto = {
      id: payload.user.id,
      email: payload.user.email,
      first_name: payload.user.first_name,
      last_name: payload.user.last_name,
    };
    try {
      await this._runExportJob(payload.jobId, payload.filters, user);
    } catch (err: unknown) {
      this._failJob(payload.jobId, err);
    }
  }

  private _failJob(jobId: string, err: unknown): void {
    this._logger.error(`Export job ${jobId} failed: ${getThrownMessage(err)}`);
    const job = this._jobs.get(jobId);
    if (job) {
      job.status = 'failed';
      job.errorMessage = getThrownMessage(err) || 'Unknown error';
    }
  }

  private async _runExportJob(
    jobId: string,
    filters: BasicReportFiltersDto,
    user: TokenDto,
  ): Promise<void> {
    const job = this._jobs.get(jobId);
    if (!job) return;

    job.status = 'processing';

    const maxRows = defaultMaxRows();
    const listRes =
      await this._resultsService.getResultDataForBasicReport(filters);
    const basicRows = (listRes?.response ?? []) as Record<string, unknown>[];

    if (maxRows != null && basicRows.length > maxRows) {
      throw new Error(
        `Too many results (${basicRows.length}). Maximum allowed is ${maxRows}. Narrow your filters.`,
      );
    }
    if (basicRows.length === 0) {
      throw new Error('No results match the current filters.');
    }

    const byType = new Map<string, Record<string, unknown>[]>();
    const skippedRows: {
      result_code: unknown;
      version_id: unknown;
      reason: string;
    }[] = [];

    const validRows = basicRows.filter(
      (r) => r.result_code != null && r.version_id != null,
    );
    if (validRows.length < basicRows.length) {
      this._logger.warn(
        `${basicRows.length - validRows.length} list row(s) lacked result_code or version_id and were ignored.`,
      );
    }
    const rowPhaseYears = Array.from(
      new Set(
        basicRows
          .map((r) => Number(r.phase_year))
          .filter((y) => Number.isFinite(y)),
      ),
    );
    const p25Years = new Set(p25PhaseYears());
    const hasP25Rows = rowPhaseYears.some((y) => p25Years.has(y));
    const hasNonP25Rows = rowPhaseYears.some((y) => !p25Years.has(y));

    if (hasP25Rows && hasNonP25Rows) {
      throw new Error(
        'Full metadata export cannot mix P25 and previous phases. Please filter one phase model at a time.',
      );
    }

    if (hasP25Rows) {
      const selectedP25Columns = normalizeRequestedP25Columns(
        filters.selectedColumns,
      );
      const resultCodes = Array.from(
        new Set(
          validRows
            .map((r) => Number(r.result_code))
            .filter((n) => Number.isFinite(n) && n > 0),
        ),
      );
      const p25Res =
        await this._resultsService.getP25ExcelRowsByResultCodes(resultCodes);
      const p25Rows = (p25Res?.response ?? []) as Record<string, unknown>[];
      if (!p25Rows.length) {
        throw new Error(
          'No rows were returned from the P25 Excel view for the selected filters.',
        );
      }

      for (const row of p25Rows) {
        const flat = pickColumns(normalizeTabularRow(row), selectedP25Columns);
        const typeKey = tabularResultTypeKey(flat['result_type'], 'P25');
        let bucket = byType.get(typeKey);
        if (!bucket) {
          bucket = [];
          byType.set(typeKey, bucket);
        }
        bucket.push(flat);
      }
    } else {
      // Non-P25 path: reuse legacy reporting list rows directly (no per-result DB function/procedure).
      for (const basicRow of basicRows) {
        const flat = normalizeTabularRow(basicRow);
        const typeKey = tabularResultTypeKey(basicRow['result_type'], 'Legacy');
        let bucket = byType.get(typeKey);
        if (!bucket) {
          bucket = [];
          byType.set(typeKey, bucket);
        }
        bucket.push(flat);
      }
    }

    if (byType.size === 0) {
      throw new Error(
        'Could not build export: no full metadata rows were produced.',
      );
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PRMS';
    workbook.created = new Date();

    if (skippedRows.length > 0) {
      const sh = workbook.addWorksheet(sanitizeSheetName('Skipped — review'));
      sh.addRow(['result_code', 'version_id', 'reason']);
      for (const s of skippedRows) {
        sh.addRow([s.result_code, s.version_id, s.reason]);
      }
    }

    for (const [typeName, rows] of byType.entries()) {
      const allKeys = new Set<string>();
      rows.forEach((r) => Object.keys(r).forEach((k) => allKeys.add(k)));
      const columns = Array.from(allKeys);
      const sheet = workbook.addWorksheet(sanitizeSheetName(typeName));
      sheet.addRow(columns);
      for (const row of rows) {
        sheet.addRow(columns.map((c) => row[c] ?? ''));
      }
    }

    const workbookBinary = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.from(workbookBinary);

    const fileBase = `results_full_metadata_${jobId.slice(0, 8)}`;
    const key = `exports/reporting/${fileBase}.xlsx`;
    const fileName = `${fileBase}.xlsx`;

    const downloadUrl = await this._uploadToS3AndSign(key, buffer);

    job.status = 'completed';
    job.rowCount = basicRows.length;
    job.fileName = fileName;
    job.downloadUrl = downloadUrl;

    const exportedCount = basicRows.length - skippedRows.length;
    this._sendReadyEmail(
      user,
      downloadUrl,
      fileName,
      basicRows.length,
      exportedCount,
      skippedRows.length,
    );

    this._logger.log(
      `Export job ${jobId} completed (${exportedCount}/${basicRows.length} rows exported, ${skippedRows.length} skipped, ${byType.size} type sheets).`,
    );
  }

  private async _uploadToS3AndSign(
    key: string,
    body: Buffer,
  ): Promise<string | undefined> {
    const bucket = env.AWS_BUCKET_NAME;
    if (!bucket) {
      this._logger.error('AWS_BUCKET_NAME is not set; skip S3 upload.');
      return undefined;
    }

    try {
      const s3 = new AWS.S3({
        region: env.AWS_REGION || process.env.AWS_REGION || 'us-east-1',
      });

      await s3
        .putObject({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
        .promise();

      return s3.getSignedUrl('getObject', {
        Bucket: bucket,
        Key: key,
        Expires: 60 * 60 * 24 * 7,
      });
    } catch (e) {
      this._logger.error(`S3 upload failed: ${(e as Error)?.message}`);
      return undefined;
    }
  }

  private _sendReadyEmail(
    user: TokenDto,
    downloadUrl: string | undefined,
    fileName: string,
    sourceRowCount: number,
    exportedCount: number,
    skippedCount: number,
  ): void {
    const skippedNote =
      skippedCount > 0
        ? `\n${skippedCount} result(s) could not be included (see "Skipped — review" sheet in the Excel). Fix: correct scalar subqueries in the DB function for those result_code / version_id pairs.\n`
        : '\n';

    const requesterNote = `\nRequested by (session): ${user.email}\n`;

    const textBody = downloadUrl
      ? `Your full metadata export is ready.\n\nIncluded: ${exportedCount} of ${sourceRowCount} filtered result(s).${skippedNote}${requesterNote}\nFile: ${fileName}\nDownload (link expires in 7 days):\n${downloadUrl}\n`
      : `Your full metadata export was generated (${exportedCount} of ${sourceRowCount} result(s) included) but the download link could not be created (storage configuration). File name: ${fileName}. Please contact support.${requesterNote}\n`;

    const payload: ConfigMessageDto = {
      ...(env.EMAIL_SENDER
        ? {
            from: {
              email: env.EMAIL_SENDER,
              name: 'PRMS Reporting Tool -',
            },
          }
        : {}),
      emailBody: {
        subject: '[PRMS] Your results export is ready',
        to: ['j.delgado@cgiar.org', user?.email],
        message: { text: textBody },
      },
    };

    this._emailNotificationService.sendEmail(payload);
  }
}
