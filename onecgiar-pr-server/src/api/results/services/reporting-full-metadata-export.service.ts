import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { env } from 'node:process';
import * as AWS from 'aws-sdk';
import ExcelJS from 'exceljs';
import * as handlebars from 'handlebars';
import { EmailNotificationManagementService } from '../../../shared/microservices/email-notification-management/email-notification-management.service';
import { EmailTemplate } from '../../../shared/microservices/email-notification-management/enum/email-notification.enum';
import { ResultsService } from '../results.service';
import { BasicReportFiltersDto } from '../dto/basic-report-filters.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ConfigMessageDto } from '../../../shared/microservices/email-notification-management/dto/send-email.dto';
import { ReportingMetadataExportQueuePublisherService } from '../../../shared/microservices/reporting-metadata-export-queue/reporting-metadata-export-queue-publisher.service';
import type { ReportingMetadataExportJobPayload } from '../dto/reporting-metadata-export-job.payload';
import { TemplateRepository } from '../../platform-report/repositories/template.repository';

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
  'toc_planned_result',
] as const;

/** Always projected when building P25 tabular rows (not necessarily exported) so per-sheet Section 7 filtering works. */
const P25_INTERNAL_TYPE_ID_COLUMN = 'result_type_id' as const;

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

/** Display labels for P25 tabular export headers (keys stay as DB column slugs in data). */
const P25_EXCEL_COLUMN_HEADER_LABELS: Record<string, string> = {
  s7_pc_policy_type_id: 'Policy change — type ID',
  s7_pc_policy_type_name: 'Policy change — type',
  s7_pc_policy_amount: 'Policy change — amount',
  s7_pc_status_policy_change: 'Policy change — amount status',
  s7_pc_stage_policy_change: 'Policy change — stage',
  s7_pc_implementing_organizations: 'Policy change — implementing organizations',
  s7_pc_result_related: 'Policy change — related result (questions)',
  s7_pc_result_related_engagement: 'Policy change — related result engagement',
  s7_iu_actors: 'Innovation use — actors',
  s7_iu_organization_lines: 'Innovation use — organizations',
  s7_iu_measures: 'Innovation use — measures',
  s7_iu_readiness_level: 'Innovation use — readiness level',
  s7_cd_female_using: 'Capacity sharing — female participants',
  s7_cd_male_using: 'Capacity sharing — male participants',
  s7_cd_non_binary_using: 'Capacity sharing — non-binary participants',
  s7_cd_unknown_using: 'Capacity sharing — unknown gender participants',
  s7_cd_capdev_term: 'Capacity sharing — term',
  s7_cd_delivery_method: 'Capacity sharing — delivery method',
  s7_cd_is_attending_for_organization: 'Capacity sharing — attending for organization',
  s7_cd_organizations: 'Capacity sharing — organizations',
  s7_kp_handle: 'Knowledge Product — CGSpace handle URL',
  s7_kp_knowledge_product_type: 'Knowledge Product — type',
  s7_kp_authors: 'Knowledge Product — authors',
  s7_kp_licence: 'Knowledge Product — licence',
  s7_kp_agrovocs: 'Knowledge Product — Agrovoc keywords',
  s7_kp_keywords: 'Knowledge Product — keywords',
  s7_kp_comodity: 'Knowledge Product — commodity',
  s7_kp_sponsors: 'Knowledge Product — sponsors',
  s7_kp_cgspace_isi: 'Knowledge Product — CGSpace ISI',
  s7_kp_cgspace_open_access: 'Knowledge Product — CGSpace open access',
  s7_kp_cgspace_issue_year: 'Knowledge Product — CGSpace issue year',
  s7_kp_cgspace_online_year: 'Knowledge Product — CGSpace online year',
  s7_kp_cgspace_doi: 'Knowledge Product — CGSpace DOI',
  s7_kp_cgspace_peer_reviewed: 'Knowledge Product — CGSpace peer reviewed',
  s7_kp_wos_isi: 'Knowledge Product — other source ISI',
  s7_kp_wos_open_access: 'Knowledge Product — other source open access',
  s7_kp_wos_issue_year: 'Knowledge Product — other source issue year',
  s7_kp_wos_doi: 'Knowledge Product — other source DOI',
  s7_kp_wos_peer_reviewed: 'Knowledge Product — other source peer reviewed',
  s7_kp_altmetric_url: 'Knowledge Product — Altmetric URL',
  s7_kp_altmetric_score: 'Knowledge Product — Altmetric score',
  s7_kp_fair_findable: 'Knowledge Product — FAIR findable',
  s7_kp_fair_accessible: 'Knowledge Product — FAIR accessible',
  s7_kp_fair_interoperable: 'Knowledge Product — FAIR interoperable',
  s7_kp_fair_reusable: 'Knowledge Product — FAIR reusable',
  s7_id_innovation_nature: 'Innovation development — nature',
  s7_id_innovation_type: 'Innovation development — type',
  s7_id_innovation_developers: 'Innovation development — developers',
  s7_id_innovation_collaborators: 'Innovation development — collaborators',
  s7_id_readiness_level: 'Innovation development — readiness level',
  s7_id_readiness_level_justification: 'Innovation development — readiness justification',
  s7_id_published_ipsr: 'Innovation development — published in IPSR',
  s7_id_actors: 'Innovation development — actors',
  s7_id_organization_lines: 'Innovation development — organizations',
  s7_id_measures: 'Innovation development — measures',
  s7_id_innovation_investments: 'Innovation development — investments',
  s7_id_pictures_evidence: 'Innovation development — pictures evidence',
  s7_id_materials_evidence: 'Innovation development — materials evidence',
  s7_id_url_readiness: 'Innovation development — readiness image URL',
};

function titleCaseSnakeColumn(key: string): string {
  return key
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function p25ExcelColumnHeader(key: string): string {
  return P25_EXCEL_COLUMN_HEADER_LABELS[key] ?? titleCaseSnakeColumn(key);
}

/** Section 7 column slug prefixes on the P25 Excel view, keyed by `result_type_id`. */
const P25_S7_PREFIX_BY_RESULT_TYPE_ID: Partial<Record<number, string>> = {
  1: 's7_pc_',
  2: 's7_iu_',
  5: 's7_cd_',
  6: 's7_kp_',
  7: 's7_id_',
};

/**
 * Each worksheet is one indicator type; drop Section 7 columns that belong to other types
 * (otherwise KP sheets would still show empty IU/PC/… columns when “full metadata” was requested).
 */
function filterP25SheetColumnsByResultType(
  orderedColumns: string[],
  resultTypeId: unknown,
): string[] {
  let idNum = Number.NaN;
  if (typeof resultTypeId === 'number') {
    idNum = resultTypeId;
  } else if (resultTypeId != null && resultTypeId !== '') {
    idNum = Number(resultTypeId);
  }
  const prefix = Number.isFinite(idNum)
    ? P25_S7_PREFIX_BY_RESULT_TYPE_ID[idNum]
    : undefined;
  if (prefix === undefined) {
    return orderedColumns.filter((c) => !c.startsWith('s7_'));
  }
  return orderedColumns.filter(
    (c) => !c.startsWith('s7_') || c.startsWith(prefix),
  );
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
    private readonly _templateRepository: TemplateRepository,
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
    const listRes = await this._resultsService.getResultDataForBasicReport(
      filters,
      user,
    );
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

    /** Ordered column list for P25 (used again when writing sheets so Section 7 cols can be trimmed per type). */
    let p25SheetColumnOrder: string[] | null = null;

    if (hasP25Rows) {
      const selectedP25Columns = normalizeRequestedP25Columns(
        filters.selectedColumns,
      );
      p25SheetColumnOrder = selectedP25Columns;
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

      const columnsForP25Pick = Array.from(
        new Set<string>([
          ...selectedP25Columns,
          P25_INTERNAL_TYPE_ID_COLUMN,
        ]),
      );
      for (const row of p25Rows) {
        const flat = pickColumns(normalizeTabularRow(row), columnsForP25Pick);
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
      let columns: string[];
      if (p25SheetColumnOrder?.length && rows.length > 0) {
        columns = filterP25SheetColumnsByResultType(
          p25SheetColumnOrder,
          rows[0]['result_type_id'],
        );
      } else {
        const allKeys = new Set<string>();
        rows.forEach((r) => Object.keys(r).forEach((k) => allKeys.add(k)));
        columns = Array.from(allKeys);
      }
      const sheet = workbook.addWorksheet(sanitizeSheetName(typeName));
      sheet.addRow(columns.map((c) => p25ExcelColumnHeader(c)));
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
    await this._sendReadyEmail(
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

  private async _sendReadyEmail(
    user: TokenDto,
    downloadUrl: string | undefined,
    fileName: string,
    sourceRowCount: number,
    exportedCount: number,
    skippedCount: number,
  ): Promise<void> {
    const skippedNote =
      skippedCount > 0
        ? `\n${skippedCount} result(s) could not be included (see "Skipped — review" sheet in the Excel). Fix: correct scalar subqueries in the DB function for those result_code / version_id pairs.\n`
        : '\n';

    const requesterNote = `\nRequested by (session): ${user.email}\n`;

    const textBody = downloadUrl
      ? `Your full metadata export is ready.\n\nIncluded: ${exportedCount} of ${sourceRowCount} filtered result(s).${skippedNote}${requesterNote}\nFile: ${fileName}\nDownload (link expires in 7 days):\n${downloadUrl}\n`
      : `Your full metadata export was generated (${exportedCount} of ${sourceRowCount} result(s) included) but the download link could not be created (storage configuration). File name: ${fileName}. Please contact support.${requesterNote}\n`;

    const userName =
      [user.first_name, user.last_name]
        .map((s) => (typeof s === 'string' ? s.trim() : ''))
        .filter(Boolean)
        .join(' ')
        .trim() || user.email;

    const templateRow = await this._templateRepository.findOne({
      where: { name: EmailTemplate.FULL_METADATA_EXPORT, is_active: true },
    });

    let message: ConfigMessageDto['emailBody']['message'] = { text: textBody };

    if (templateRow?.template?.trim()) {
      try {
        const compiled = handlebars.compile(templateRow.template);
        const html = compiled({
          userName,
          exportedCount,
          sourceRowCount,
          fileName,
          skippedCount,
          hasSkippedRows: skippedCount > 0,
          hasDownloadLink: !!downloadUrl,
          downloadUrl: downloadUrl ?? '',
          linkExpiresDays: 7,
          requesterEmail: user.email,
        });
        message = {
          text: textBody,
          socketFile: html,
        };
      } catch (err: unknown) {
        this._logger.error(
          `Full metadata export email template compile failed: ${getThrownMessage(err)}`,
        );
      }
    } else {
      this._logger.warn(
        `Email template "${EmailTemplate.FULL_METADATA_EXPORT}" not found or empty; sending plain text only.`,
      );
    }

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
        message,
      },
    };

    this._emailNotificationService.sendEmail(payload);
  }
}
