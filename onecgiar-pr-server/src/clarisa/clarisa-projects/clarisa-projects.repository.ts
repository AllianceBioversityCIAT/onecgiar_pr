import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ClarisaProject } from './entity/clarisa-projects.entity';
import { APPROVED_MAPPING_STATUSES } from '../../api/bilateral/constants/approved-mapping-statuses.constants';
import { SourceEnum } from '../../api/results/entities/result.entity';
import { ResultStatusData } from '../../shared/constants/result-status.enum';

export interface PortfolioProjectFactsRow {
  id: number;
  organizationCode: number | null;
  sourceCenterAcronym: string | null;
  approvedProgramCodes: string[];
  hasBilateral: boolean;
  hasW1w2: boolean;
}

@Injectable()
export class ClarisaProjectsRepository extends Repository<ClarisaProject> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ClarisaProject, dataSource.createEntityManager());
  }

  /**
   * One row per active project of the given CLARISA `year` (phase) with the facts the
   * Portfolio Overview W3 section aggregates (WPS-T-1). Read-only; every value is bound.
   *
   * Bind order follows the text order of the placeholders: approved statuses,
   * 'API', version, Discontinued, 'Result', version, year.
   */
  async getPortfolioProjectFacts(
    year: number,
    resolvedVersionId: number,
  ): Promise<PortfolioProjectFactsRow[]> {
    const sql = `
      SELECT
        cp.id AS id,
        cp.organization_code AS organization_code,
        cp.source_center_acronym AS source_center_acronym,
        (
          SELECT GROUP_CONCAT(DISTINCT TRIM(cpm.program_code))
          FROM clarisa_project_mappings cpm
          WHERE cpm.project_id = cp.id
            AND cpm.program_code IS NOT NULL
            AND TRIM(cpm.program_code) <> ''
            AND cpm.allocation > 0
            AND BINARY TRIM(cpm.status) IN (?)
        ) AS approved_program_codes,
        EXISTS (
          SELECT 1
          FROM results_by_projects rbp
          INNER JOIN result r ON r.id = rbp.result_id
          WHERE rbp.project_id = cp.id
            AND rbp.is_active = 1
            AND r.is_active = 1
            AND r.source = ?
            AND r.version_id = ?
            AND (r.status_id IS NULL OR r.status_id <> ?)
        ) AS has_bilateral,
        EXISTS (
          SELECT 1
          FROM results_by_projects rbp
          INNER JOIN result r ON r.id = rbp.result_id
          WHERE rbp.project_id = cp.id
            AND rbp.is_active = 1
            AND r.is_active = 1
            AND r.source = ?
            AND r.version_id = ?
        ) AS has_w1w2
      FROM clarisa_projects cp
      WHERE cp.phase = ?
        AND (cp.is_active IS NULL OR cp.is_active <> 0)
    `;
    const params = [
      [...APPROVED_MAPPING_STATUSES],
      SourceEnum.Bilateral,
      resolvedVersionId,
      ResultStatusData.Discontinued.value,
      SourceEnum.Result,
      resolvedVersionId,
      year,
    ];

    return this.dataSource
      .query(sql, params)
      .then((rows: any[]) =>
        rows.map((row) => ({
          id: Number(row.id),
          organizationCode:
            row.organization_code === null ||
            row.organization_code === undefined
              ? null
              : Number(row.organization_code),
          sourceCenterAcronym: row.source_center_acronym ?? null,
          approvedProgramCodes: String(row.approved_program_codes ?? '')
            .split(',')
            .map((code) => code.trim())
            .filter((code) => code !== ''),
          hasBilateral: Number(row.has_bilateral) === 1,
          hasW1w2: Number(row.has_w1w2) === 1,
        })),
      )
      .catch((err) => {
        throw this._handlersError.returnErrorRepository({
          error: err,
          className: ClarisaProjectsRepository.name,
          debug: true,
        });
      });
  }
}
