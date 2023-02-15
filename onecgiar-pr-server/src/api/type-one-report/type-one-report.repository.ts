import { Injectable, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { env } from 'process';
import { TypeOneReport } from './entities/type-one-report.entity';
import { HandlersError } from 'src/shared/handlers/error.utils';

@Injectable()
export class TypeOneReportRepository {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,

  ) { }

  async getFactSheetByInit(
    initId: number
  ) {
    const initiativeGeneralInformationQuery = `
    SELECT
      i.id AS initiative_id,
      ibs.id AS initiative_stage_id,
      i.official_code,
      i.name AS initiative_name,
      i.acronym AS short_name,
      caa.name AS action_area,
      (
        SELECT
          CONCAT(
            u.first_name,
            SPACE(1),
            u.last_name,
            ' - ',
            u.email
          )
        FROM
          ${env.DB_OST}.initiatives_by_users ibu
          LEFT JOIN ${env.DB_OST}.users u ON u.id = ibu.userId
          LEFT JOIN ${env.DB_OST}.roles r ON r.id = ibu.roleId
        WHERE
          ibu.roleId IN(2, 3)
          AND ibu.active = 1
          AND ibu.initiativeId = i.id
          AND r.id = 2
        ORDER BY
          ibu.initiativeId
      ) AS iniative_lead,
      (
        SELECT
          CONCAT(
            u.first_name,
            SPACE(1),
            u.last_name,
            ' - ',
            u.email
          )
        FROM
        ${env.DB_OST}.initiatives_by_users ibu
          LEFT JOIN ${env.DB_OST}.users u ON u.id = ibu.userId
          LEFT JOIN ${env.DB_OST}.roles r ON r.id = ibu.roleId
        WHERE
          ibu.roleId IN(2, 3)
          AND ibu.active = 1
          AND ibu.initiativeId = i.id
          AND r.id = 3
        ORDER BY
          ibu.initiativeId
      ) AS initiative_deputy
    FROM
    ${env.DB_OST}.initiatives i
      LEFT JOIN ${env.DB_OST}.initiatives_by_stages ibs ON ibs.initiativeId = i.id
      LEFT JOIN ${env.DB_OST}.general_information gi ON gi.initvStgId = ibs.id
      LEFT JOIN ${env.DB_OST}.clarisa_action_areas caa ON caa.id = gi.action_area_id
    WHERE
      ibs.active = 1
      AND i.id = ?
    ORDER BY
      i.official_code ASC;
    `;

    const countriesProposalQuery = `
    SELECT
      DISTINCT(co.country_id),
      (
        SELECT
          cc.name
        FROM
          ${env.DB_OST}.clarisa_countries cc
        WHERE
          cc.code = co.country_id
      ) as name,
      co.initvStgId
    FROM
      ${env.DB_OST}.countries_by_initiative_by_stage co
    WHERE
      co.initvStgId = ?
      AND co.active = 1
      AND co.wrkPkgId IS NOT NULL
    GROUP BY
      co.id,
      co.country_id;
    `;

    const regionsProposalQuery = `
    SELECT
      DISTINCT (r.region_id),
      (
        SELECT
          cr.name
        FROM
        ${env.DB_OST}.clarisa_regions_cgiar cr
        WHERE
          cr.id = r.region_id
      ) as name,
      r.initvStgId
    FROM
      ${env.DB_OST}.regions_by_initiative_by_stage r
    WHERE
      r.initvStgId = ?
      AND r.active = 1
      AND r.wrkPkgId IS NOT NULL
    GROUP BY
      r.region_id
    `;

    const countrieReportedQuery = `
    SELECT
      DISTINCT cc3.name,
      rbi.inititiative_id 
    FROM
      prdb.result_country rc2
      LEFT JOIN prdb.clarisa_countries cc3 ON cc3.id = rc2.country_id
      LEFT JOIN prdb.result r ON r.id = rc2.result_id
      LEFT JOIN prdb.results_by_inititiative rbi ON rbi.result_id = r.id
    WHERE
      rbi.inititiative_id = ?
      AND rc2.is_active = 1
      AND r.is_active = 1;
    `;

    const regionsReportedQuery = `
    SELECT
      DISTINCT cr.name,
      rbi.inititiative_id 
    FROM
      prdb.result_region rr
      LEFT JOIN prdb.clarisa_regions cr ON cr.um49Code = rr.region_id
      LEFT JOIN prdb.result r ON r.id = rr.result_id
      LEFT JOIN prdb.results_by_inititiative rbi ON rbi.result_id = r.id
    WHERE
      rbi.inititiative_id = ?
      AND rr.is_active = 1;
    `;

    const eoiOutcomeQuery = `
    SELECT
      re.initvStgId,
      re.id,
      rt.name as type_name,
      re.result_type_id as result_type,
      re.result_title,
      re.is_global,
      re.active
    FROM
      ${env.DB_OST}.results re
      left join ${env.DB_OST}.results_types rt on rt.id = re.result_type_id
    WHERE
      re.initvStgId = ?
      AND re.active = 1
      AND re.result_type_id = 3
    order by
      re.result_type_id;
    `;

    const budgetQuery = `
    SELECT
      ibs.id AS initvStgId,
      fry.year,
      SUM(fry.value) AS total
    FROM ${env.DB_OST}.financial_resources_years fry
      LEFT JOIN ${env.DB_OST}.financial_resources fr ON fr.id = fry.financialResourcesId
      LEFT JOIN ${env.DB_OST}.initiatives_by_stages ibs ON ibs.id = fr.initvStgId
    WHERE
      ibs.id = ?
      AND fry.active = 1
      AND fr.financial_type = 'activity_breakdown'
    GROUP BY fry.year;
    `;

    const genderScoreQuery = `
    SELECT 
      i.id AS initiative_id,
      a.Gender_Score AS gender_score
    FROM ${env.DB_OST}.aecd a
      LEFT JOIN ${env.DB_OST}.initiatives i ON i.official_code = a.ID
    WHERE i.id = ?;
    `;

    try {
      const generalInformation: any[] = await this.dataSource.query(initiativeGeneralInformationQuery, [initId]);
      const initiative_stage_id = generalInformation[0].initiative_stage_id;
      const countriesProposal: any[] = await this.dataSource.query(countriesProposalQuery, [initiative_stage_id])
      const regionsProposal: any[] = await this.dataSource.query(regionsProposalQuery, [initiative_stage_id])
      const countrieReported: any[] = await this.dataSource.query(countrieReportedQuery, [initId]);
      const regionsReported: any[] = await this.dataSource.query(regionsReportedQuery, [initId]);
      const eoiOutcome: any[] = await this.dataSource.query(eoiOutcomeQuery, [initiative_stage_id]);
      const budget: any[] = await this.dataSource.query(budgetQuery, [initiative_stage_id]);
      const genderScore: any[] = await this.dataSource.query(genderScoreQuery, [initId]);

      generalInformation.map((gi) => {
        gi['countriesProposal'] = countriesProposal.filter((cp) => {
          return cp.initvStgId === gi.initiative_stage_id;
        });
        gi['regionsProposal'] = regionsProposal.filter((rp) => {
          return rp.initvStgId === gi.initiative_stage_id;
        });
        gi['countrieReported'] = countrieReported.filter((cr) => {
          return cr.inititiative_id === gi.initiative_id;
        });
        gi['regionsReported'] = regionsReported.filter((rr) => {
          return rr.inititiative_id === gi.initiative_id;
        });
        gi['eoiOutcome'] = eoiOutcome.filter((eoi) => {
          return eoi.initvStgId === gi.initiative_stage_id;
        });
        gi['budget'] = budget.filter((b) => {
          return b.initvStgId === gi.initiative_stage_id;
        });
        gi['genderScore'] = genderScore.filter((gs) => {
          return gs.initiative_id === gi.initiative_id;
        });
      });

      return [generalInformation[0]];
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: TypeOneReportRepository.name,
        error: error,
        debug: true,
      });
    }
  }

}
