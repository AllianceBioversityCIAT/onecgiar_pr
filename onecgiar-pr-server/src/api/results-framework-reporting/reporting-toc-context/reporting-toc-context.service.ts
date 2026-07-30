import { HttpStatus, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { env } from 'process';
import { YearRepository } from '../../results/years/year.repository';
import { REPORTING_TOC_APP_MODULE_ID } from './reporting-toc-context.constants';
import {
  ReportingTocContext,
  ReportingTocContextResolutionError,
} from './reporting-toc-context.interface';

interface VersionPhaseRow {
  id: number;
  toc_pahse_id: string | null;
  phase_year: number | null;
  phase_name: string | null;
}

@Injectable()
export class ReportingTocContextService {
  constructor(
    private readonly _yearRepository: YearRepository,
    private readonly _dataSource: DataSource,
  ) {}

  /**
   * Resolves mandatory ToC reporting parameters for DB_TOC queries.
   *
   * - reportingYear: active row in `year` (or explicit override)
   * - phaseUuid: `version.toc_pahse_id` for that phase_year (active PRMS version)
   */
  async resolve(yearOverride?: number): Promise<ReportingTocContext> {
    const reportingYear = await this.resolveReportingYear(yearOverride);
    const versionRow = await this.findActiveVersionPhase(reportingYear);

    if (!versionRow?.toc_pahse_id?.trim()) {
      throw this.buildResolutionError(
        HttpStatus.NOT_FOUND,
        `No TOC phase is configured for reporting year ${reportingYear}.`,
      );
    }

    return {
      reportingYear,
      phaseUuid: versionRow.toc_pahse_id.trim(),
      versionId: versionRow.id,
      phaseName: versionRow.phase_name,
    };
  }

  private async resolveReportingYear(yearOverride?: number): Promise<number> {
    if (yearOverride !== undefined) {
      if (!Number.isFinite(yearOverride) || yearOverride < 0) {
        throw this.buildResolutionError(
          HttpStatus.BAD_REQUEST,
          'The reporting year must be a valid positive integer.',
        );
      }
      return yearOverride;
    }

    const activeYear = await this._yearRepository.findOne({
      where: { active: true },
      select: ['year'],
    });

    if (!activeYear) {
      throw this.buildResolutionError(
        HttpStatus.NOT_FOUND,
        'No active reporting year was found.',
      );
    }

    const reportingYear = Number(activeYear.year);

    if (!Number.isFinite(reportingYear) || reportingYear < 0) {
      throw this.buildResolutionError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'The active reporting year configured is invalid.',
      );
    }

    return reportingYear;
  }

  private async findActiveVersionPhase(
    reportingYear: number,
  ): Promise<VersionPhaseRow | null> {
    const query = `
      SELECT
        v.id,
        v.toc_pahse_id,
        v.phase_year,
        v.phase_name
      FROM \`${env.DB_NAME}\`.\`version\` v
      WHERE
        v.is_active = 1
        AND v.status = 1
        AND v.app_module_id = ?
        AND v.phase_year = ?
      LIMIT 1
    `;

    const rows = await this._dataSource.query(query, [
      REPORTING_TOC_APP_MODULE_ID,
      reportingYear,
    ]);

    return rows?.[0] ?? null;
  }

  private buildResolutionError(
    status: number,
    message: string,
  ): ReportingTocContextResolutionError {
    const error = new Error(message) as ReportingTocContextResolutionError;
    error.response = {};
    error.status = status;
    return error;
  }
}
