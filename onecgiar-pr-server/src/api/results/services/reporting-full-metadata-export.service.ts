import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { env } from 'process';
import * as AWS from 'aws-sdk';
import ExcelJS from 'exceljs';
import { EmailNotificationManagementService } from '../../../shared/microservices/email-notification-management/email-notification-management.service';
import { PlatformReportRepository } from '../../platform-report/repositories/platform-report.repository';
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

function defaultMaxRows(): number {
  const raw = env.RESULT_METADATA_EXPORT_MAX_ROWS;
  const n = raw ? Number.parseInt(raw, 10) : 500;
  return Number.isFinite(n) && n > 0 ? n : 500;
}

function dbFunctionName(): string {
  return env.RESULT_FULL_METADATA_DB_FUNCTION?.trim() || 'resultFullDataByResultCode';
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

/** Default on: single CALL with full pair list. Set RESULT_FULL_METADATA_USE_BATCH=0 to force per-row function calls. */
function useBatchProcedure(): boolean {
  const v = env.RESULT_FULL_METADATA_USE_BATCH?.trim().toLowerCase();
  return v !== '0' && v !== 'false' && v !== 'no';
}

function getThrownMessage(err: unknown): string {
  if (
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    typeof (err as { message: unknown }).message === 'string'
  ) {
    return (err as { message: string }).message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[:\\/*?[\]]/g, '_').trim() || 'Sheet';
  return cleaned.length > 31 ? cleaned.slice(0, 31) : cleaned;
}

function parseProcedureResult(row: { result?: unknown } | undefined): Record<string, unknown> | null {
  if (!row) return null;
  let payload: unknown = row.result;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }
  const obj = payload as Record<string, unknown>;
  if (obj['error'] || obj['internal_error']) {
    return null;
  }
  return obj;
}

/** MySQL ER_TOO_MANY_ROWS (1172): scalar subquery returned > 1 row (usually inside the DB function). */
const MYSQL_ERR_SUBQUERY_TOO_MANY_ROWS = 1172;

function getMysqlErrno(err: unknown): number | undefined {
  const e = err as { driverError?: { errno?: number }; errno?: number };
  return e?.driverError?.errno ?? e?.errno;
}

function isScalarSubqueryTooManyRowsError(err: unknown): boolean {
  const errno = getMysqlErrno(err);
  if (errno === MYSQL_ERR_SUBQUERY_TOO_MANY_ROWS) return true;
  const msg = getThrownMessage(err);
  return (
    msg.includes('more than one row') ||
    msg.includes('ER_TOO_MANY_ROWS')
  );
}

type BatchFullMetaItem = {
  result_code?: unknown;
  version_id?: unknown;
  payload?: unknown;
  error?: string;
};

function parseBatchProcedureJson(raw: unknown): BatchFullMetaItem[] | null {
  if (raw == null) return null;
  let parsed: unknown = raw;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed) as unknown;
    } catch {
      return null;
    }
  }
  if (!Array.isArray(parsed)) return null;
  return parsed as BatchFullMetaItem[];
}

function parsePayloadFromBatchItem(
  item: BatchFullMetaItem,
): Record<string, unknown> | null {
  return parseProcedureResult({
    result: item.payload,
  });
}

function flattenFullRow(
  basicRow: Record<string, unknown>,
  full: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    results_id: basicRow.results_id,
    result_code: basicRow.result_code,
    version_id: basicRow.version_id,
    result_type: basicRow['result_type'],
  };
  for (const [k, v] of Object.entries(full)) {
    if (v !== null && typeof v === 'object') {
      out[k] = JSON.stringify(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function normalizeTabularRow(row: Record<string, unknown>): Record<string, unknown> {
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

@Injectable()
export class ReportingFullMetadataExportService {
  private readonly _logger = new Logger(ReportingFullMetadataExportService.name);
  private readonly _jobs = new Map<string, ReportingExportJob>();

  constructor(
    private readonly _resultsService: ResultsService,
    private readonly _platformReportRepository: PlatformReportRepository,
    private readonly _emailNotificationService: EmailNotificationManagementService,
    private readonly _metadataExportQueue: ReportingMetadataExportQueuePublisherService,
  ) {}

  getJob(jobId: string, userId: number): ReportingExportJob | null {
    const job = this._jobs.get(jobId);
    if (!job || job.userId !== userId) return null;
    return { ...job };
  }

  /**
   * Accepts the same filter body as POST get/reporting/list.
   * When REPORTING_METADATA_EXPORT_QUEUE (+ RABBITMQ_URL) are set, work is dispatched to RabbitMQ
   * and processed by ReportingMetadataExportConsumer; otherwise setImmediate (same Node process).
   * Email → EmailNotificationManagementService → RMQ email MS.
   */
  enqueueExport(filters: BasicReportFiltersDto, user: TokenDto): {
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
    const listRes = await this._resultsService.getResultDataForBasicReport(filters);
    const basicRows = (listRes?.response ?? []) as Record<string, unknown>[];

    if (basicRows.length > maxRows) {
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
    ) as Record<string, unknown>[];
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
        const flat = normalizeTabularRow(row);
        const typeKey = String(row['result_type'] ?? 'P25');
        if (!byType.has(typeKey)) byType.set(typeKey, []);
        byType.get(typeKey)!.push(flat);
      }
    } else {
      // Non-P25 path: reuse legacy reporting list rows directly (no per-result DB function/procedure).
      for (const basicRow of basicRows) {
        const flat = normalizeTabularRow(basicRow);
        const typeKey = String(basicRow['result_type'] ?? 'Legacy');
        if (!byType.has(typeKey)) byType.set(typeKey, []);
        byType.get(typeKey)!.push(flat);
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
      emailBody: {
        subject: '[PRMS] Your results export is ready',
        // TODO: restore to: [user.email] after testing
        to: ['j.delgado@cgiar.org'],
        message: { text: textBody },
      },
    };

    this._emailNotificationService.sendEmail(payload);
  }
}