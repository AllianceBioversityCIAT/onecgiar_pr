import { DataSource, Repository } from 'typeorm';
import { PlatformReport } from '../entities/platform-report.entity';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { Injectable } from '@nestjs/common';
import type { ContributorsRawRows } from '../platform-report-contributors';

@Injectable()
export class PlatformReportRepository extends Repository<PlatformReport> {
  constructor(
    private readonly _dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(PlatformReport, _dataSource.createEntityManager());
  }

  async getDataFromProcedure(procedureName: string, parameters: any[]) {
    /*
        the number of parameters of the function to be called depends on the
        parameters array, and as named queries are not supported (yet) on our
        project, we need to create a positional argument string that accomodates
        the lenght of the parameters array
    */
    const paramString: string = '?'
      .repeat(parameters?.length ?? 0)
      .split('')
      .join(',');

    const query = `select ${procedureName}(${paramString}) as result`;
    try {
      return await this.query(query, parameters);
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: PlatformReportRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  /**
   * P2-3095 — raw rows for the 2026 Contributors and Partners data the SQL report function does not
   * return (ToC / "Other(s)" split and the two "not mapped to the ToC" questions). Read-only.
   */
  async getContributorsRawRows(
    resultCode: number,
    versionId: number,
  ): Promise<ContributorsRawRows> {
    try {
      const [base] = await this.query(
        `SELECT r.id AS result_id, v.phase_year,
                (SELECT rbi.inititiative_id FROM results_by_inititiative rbi
                  WHERE rbi.result_id = r.id AND rbi.initiative_role_id = 1 AND rbi.is_active = 1
                  LIMIT 1) AS primary_initiative_id
           FROM result r
           JOIN version v ON v.id = r.version_id
          WHERE r.result_code = ? AND r.version_id = ? AND r.is_active = 1
          LIMIT 1`,
        [resultCode, versionId],
      );
      if (!base) {
        return {
          base: null,
          toc: null,
          initiatives: [],
          centers: [],
          partners: [],
        };
      }

      const resultId = base.result_id;
      const [toc] = await this.query(
        `SELECT rtr.planned_result, rtr.program_invested_financial_resources, rtr.toc_progressive_narrative
           FROM results_toc_result rtr
          WHERE rtr.results_id = ? AND rtr.initiative_id = ? AND rtr.is_active = 1
          ORDER BY rtr.result_toc_result_id ASC
          LIMIT 1`,
        [resultId, base.primary_initiative_id],
      );
      const initiatives = await this.query(
        `SELECT CONCAT(ci.official_code, ' - ', ci.name) AS initiative_short_name, rbi.from_toc
           FROM results_by_inititiative rbi
           JOIN clarisa_initiatives ci ON ci.id = rbi.inititiative_id
          WHERE rbi.result_id = ? AND rbi.initiative_role_id = 2 AND rbi.is_active = 1
          ORDER BY rbi.id ASC`,
        [resultId],
      );
      const centers = await this.query(
        `SELECT rc.is_primary AS is_primary_center,
                CONCAT(ci.acronym, ' - ', ci.name) AS center_name, rc.from_toc
           FROM results_center rc
           LEFT JOIN clarisa_center cc ON cc.code = rc.center_id
           LEFT JOIN clarisa_institutions ci ON ci.id = cc.institutionId
          WHERE rc.result_id = ? AND rc.is_active > 0
          ORDER BY rc.id ASC`,
        [resultId],
      );
      const partners = await this.query(
        `SELECT CONCAT(IF(COALESCE(ci.acronym, '') = '', '', CONCAT(ci.acronym, ' - ')), ci.name) AS partner_name,
                CONCAT(cc.name, ' (', cc.iso_alpha_2, ')') AS partner_country_hq,
                cit.name AS partner_type, rbi.from_toc
           FROM results_by_institution rbi
           JOIN clarisa_institutions ci ON ci.id = rbi.institutions_id
           LEFT JOIN clarisa_countries cc ON cc.iso_alpha_2 = ci.headquarter_country_iso2
           LEFT JOIN clarisa_institution_types cit ON cit.code = ci.institution_type_code
          WHERE rbi.result_id = ? AND rbi.institution_roles_id = 2 AND rbi.is_active = 1
          ORDER BY rbi.id ASC`,
        [resultId],
      );

      return { base, toc: toc ?? null, initiatives, centers, partners };
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: PlatformReportRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
