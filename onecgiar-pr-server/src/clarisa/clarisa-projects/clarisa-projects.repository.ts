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
  /** P/A codes the project's qualifying W3 results name (primary or contributing). */
  namedProgramCodes: string[];
  hasBilateral: boolean;
  hasW1w2: boolean;
}

/** `results_by_inititiative.initiative_role_id`: 1 primary, 2 accepted contributor. */
const NAMED_INITIATIVE_ROLE_IDS = [1, 2];
/** `share_result_request.request_status_id`: 1 Pending, 2 Accepted, 4 Draft (3 Declined is excluded). */
const NAMED_REQUEST_STATUS_IDS = [1, 2, 4];

@Injectable()
export class ClarisaProjectsRepository extends Repository<ClarisaProject> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ClarisaProject, dataSource.createEntityManager());
  }

  /**
   * Projects CLARISA approves for a program in a phase year (same approval rule as
   * getPortfolioProjectFacts). Row shape mirrors AoWBilateralRepository
   * .findBilateralProjectsByProgramOfficialCode. Read-only; every value is bound.
   */
  // @akili-spec bugfix/w3-projects-by-program
  async findApprovedProjectsByProgramCode(
    programCode: string,
    phaseYear: number,
  ): Promise<any[]> {
    const sql = `
      SELECT DISTINCT
        NULL AS toc_result_id,
        NULL AS official_code,
        cp.id AS project_id,
        cp.full_name AS project_name,
        NULL AS project_summary,
        cp.organization_code AS organization_code,
        ci.id AS organization_id,
        ci.name AS organization_name,
        ci.acronym AS organization_acronym,
        ci.website_link AS organization_website_link
      FROM clarisa_projects cp
      INNER JOIN clarisa_project_mappings cpm ON cpm.project_id = cp.id
      LEFT JOIN clarisa_institutions ci ON ci.id = cp.organization_code
      WHERE UPPER(TRIM(cpm.program_code)) = UPPER(TRIM(?))
        AND cpm.allocation > 0
        AND BINARY TRIM(cpm.status) IN (?)
        AND cp.phase = ?
        AND (cp.is_active IS NULL OR cp.is_active <> 0)
      ORDER BY cp.full_name ASC
    `;

    return this.dataSource
      .query(sql, [programCode, [...APPROVED_MAPPING_STATUSES], phaseYear])
      .catch((err) => {
        throw this._handlersError.returnErrorRepository({
          error: err,
          className: ClarisaProjectsRepository.name,
          debug: true,
        });
      });
  }

  /**
   * One row per active project of the given CLARISA `year` (phase) with the facts the
   * Portfolio Overview W3 section aggregates (WPS-T-1). Read-only; every value is bound.
   *
   * Bind order follows the text order of the placeholders: approved statuses,
   * 'API', version, Discontinued, 'Result', version, then the named_program_codes
   * sub-select (roles, request statuses, 'API', version, Discontinued), year.
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
        ) AS has_w1w2,
        (
          SELECT GROUP_CONCAT(DISTINCT TRIM(ci.official_code))
          FROM results_by_projects rbp
          INNER JOIN result r ON r.id = rbp.result_id
          INNER JOIN (
            SELECT rbi.result_id AS result_id, rbi.inititiative_id AS initiative_id
            FROM results_by_inititiative rbi
            WHERE rbi.is_active = 1
              AND rbi.initiative_role_id IN (?)
            UNION
            SELECT srr.result_id AS result_id, srr.shared_inititiative_id AS initiative_id
            FROM share_result_request srr
            WHERE srr.is_active = 1
              AND srr.request_status_id IN (?)
          ) named ON named.result_id = r.id
          INNER JOIN clarisa_initiatives ci ON ci.id = named.initiative_id
          WHERE rbp.project_id = cp.id
            AND rbp.is_active = 1
            AND r.is_active = 1
            AND r.source = ?
            AND r.version_id = ?
            AND (r.status_id IS NULL OR r.status_id <> ?)
            AND ci.official_code IS NOT NULL
            AND TRIM(ci.official_code) <> ''
        ) AS named_program_codes
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
      [...NAMED_INITIATIVE_ROLE_IDS],
      [...NAMED_REQUEST_STATUS_IDS],
      SourceEnum.Bilateral,
      resolvedVersionId,
      ResultStatusData.Discontinued.value,
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
          namedProgramCodes: String(row.named_program_codes ?? '')
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
